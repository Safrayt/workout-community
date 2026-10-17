from typing import Dict, Iterable, List, Literal, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import ensure_admin, get_current_user, get_optional_current_user
from app.database import get_session
from app.files import delete_upload, save_image
from app.models import User
from app.models_article import (
    ArticleCategory,
    ArticleDB,
    ArticleImageRead,
    ArticleListItem,
    ArticleListResponse,
    ArticleRead,
    ArticleTagCount,
    ArticleTagDB,
    ArticleWrite,
    apply_article_write,
    make_unique_slug,
    referenced_images,
    replace_tags,
    try_normalize_tag,
)

router = APIRouter(prefix="/articles", tags=["articles"])

# Подпапка в uploads/ для картинок статей (см. app/files.py).
MEDIA_SUBFOLDER = "articles"

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 50
MAX_TAG_CLOUD_SIZE = 200


# =====================================================================
# Статьи раздела "База знаний → Статьи" (таблицы ArticleDB и
# ArticleTagDB, см. models_article.py). Опубликованные статьи читает
# кто угодно; черновики видит, а статьи пишет, правит и удаляет только
# администратор (см. ensure_admin в app/auth.py).
# =====================================================================


def _is_admin(user: Optional[User]) -> bool:
    return user is not None and user.is_admin


def _tags_by_article(
    session: Session, article_ids: Iterable[str]
) -> Dict[str, List[str]]:
    ids = list(article_ids)
    result: Dict[str, List[str]] = {article_id: [] for article_id in ids}

    if not ids:
        return result

    rows = session.exec(
        select(ArticleTagDB)
        .where(ArticleTagDB.article_id.in_(ids))
        .order_by(ArticleTagDB.tag)
    ).all()

    for row in rows:
        result[row.article_id].append(row.tag)

    return result


def _nicknames(
    session: Session, author_ids: Iterable[Optional[int]]
) -> Dict[int, str]:
    ids = {author_id for author_id in author_ids if author_id is not None}

    if not ids:
        return {}

    rows = session.exec(
        select(User.id, User.nickname).where(User.id.in_(ids))
    ).all()

    return {user_id: nickname for user_id, nickname in rows}


def _list_item(
    row: ArticleDB, tags: List[str], nicknames: Dict[int, str]
) -> ArticleListItem:
    return ArticleListItem(
        id=row.id,
        title=row.title,
        summary=row.summary,
        category=row.category,
        tags=tags,
        cover_url=row.cover_url,
        author_nickname=nicknames.get(row.author_id) if row.author_id else None,
        is_published=row.is_published,
        published_at=row.published_at,
        reading_minutes=row.reading_minutes,
    )


def _article_read(row: ArticleDB, session: Session) -> ArticleRead:
    tags = _tags_by_article(session, [row.id])[row.id]
    nicknames = _nicknames(session, [row.author_id])
    item = _list_item(row, tags, nicknames)

    return ArticleRead(
        **item.model_dump(),
        body=row.body,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _get_article_or_404(article_id: str, session: Session) -> ArticleDB:
    row = session.get(ArticleDB, article_id)

    if row is None:
        raise HTTPException(status_code=404, detail="Статья не найдена")

    return row


def _delete_unreferenced_images(session: Session, urls: Iterable[str]) -> None:
    """
    Удаляет файлы картинок, на которые после сохранения не ссылается ни
    одна статья (ни текстом, ни обложкой). Вызывать нужно ПОСЛЕ коммита —
    по той же причине, что и в routers/exercises.py: если бы коммит
    упал, статья осталась бы со ссылками на уже удалённые файлы.
    Проверка по всем статьям нужна на случай, если один и тот же адрес
    картинки вставили в две статьи.
    """
    for url in urls:
        still_used = session.exec(
            select(ArticleDB.id)
            .where(
                or_(ArticleDB.cover_url == url, ArticleDB.body.contains(url))
            )
            .limit(1)
        ).first()

        if still_used is None:
            delete_upload(url)


# ---------------------------------------------------------------------
# Чтение
# ---------------------------------------------------------------------


@router.get("/", response_model=ArticleListResponse)
def list_articles(
    category: Optional[ArticleCategory] = None,
    tag: List[str] = Query(default=[]),
    status_filter: Literal["published", "draft"] = Query(
        "published", alias="status"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
) -> ArticleListResponse:
    """
    Статьи одной страницей. category — одна направленность; tag можно
    повторять (?tag=a&tag=b) — тогда нужны статьи, у которых есть ВСЕ
    эти теги. status=draft — черновики, только для администратора.
    """
    if status_filter == "draft" and not _is_admin(current_user):
        raise HTTPException(
            status_code=403, detail="Черновики доступны только администратору"
        )

    conditions = [ArticleDB.is_published == (status_filter == "published")]

    if category is not None:
        conditions.append(ArticleDB.category == category)

    for raw_tag in tag:
        normalized = try_normalize_tag(raw_tag)

        if normalized is None:
            # Такого тега не может быть ни у одной статьи.
            return ArticleListResponse(
                items=[], total=0, page=page, page_size=page_size
            )

        conditions.append(
            ArticleDB.id.in_(
                select(ArticleTagDB.article_id).where(
                    ArticleTagDB.tag == normalized
                )
            )
        )

    total = session.exec(
        select(func.count()).select_from(ArticleDB).where(*conditions)
    ).one()

    order = (
        (ArticleDB.published_at.desc(), ArticleDB.id)
        if status_filter == "published"
        else (ArticleDB.updated_at.desc(), ArticleDB.id)
    )

    rows = session.exec(
        select(ArticleDB)
        .where(*conditions)
        .order_by(*order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    tags = _tags_by_article(session, [row.id for row in rows])
    nicknames = _nicknames(session, [row.author_id for row in rows])

    return ArticleListResponse(
        items=[_list_item(row, tags[row.id], nicknames) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/tags", response_model=List[ArticleTagCount])
def list_article_tags(
    category: Optional[ArticleCategory] = None,
    limit: int = Query(50, ge=1, le=MAX_TAG_CLOUD_SIZE),
    session: Session = Depends(get_session),
) -> List[ArticleTagCount]:
    """Самые частые хештеги опубликованных статей (для облака тегов)."""
    count = func.count()

    query = (
        select(ArticleTagDB.tag, count)
        .join(ArticleDB, ArticleDB.id == ArticleTagDB.article_id)
        .where(ArticleDB.is_published == True)  # noqa: E712
    )

    if category is not None:
        query = query.where(ArticleDB.category == category)

    rows = session.exec(
        query.group_by(ArticleTagDB.tag)
        .order_by(count.desc(), ArticleTagDB.tag)
        .limit(limit)
    ).all()

    return [ArticleTagCount(tag=tag, count=amount) for tag, amount in rows]


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(
    article_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
) -> ArticleRead:
    row = _get_article_or_404(article_id, session)

    # Для остальных черновик "не существует": 404, а не 403, чтобы по
    # ответу нельзя было угадать, что такая статья готовится.
    if not row.is_published and not _is_admin(current_user):
        raise HTTPException(status_code=404, detail="Статья не найдена")

    return _article_read(row, session)


# ---------------------------------------------------------------------
# Запись (только администратор)
# ---------------------------------------------------------------------


@router.post(
    "/", response_model=ArticleRead, status_code=status.HTTP_201_CREATED
)
def create_article(
    data: ArticleWrite,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ArticleRead:
    ensure_admin(current_user, "Добавлять статьи может только администратор")

    row = ArticleDB(
        id=make_unique_slug(session, data.title),
        title="",
        category=data.category,
        author_id=current_user.id,
    )
    apply_article_write(row, data)

    session.add(row)
    replace_tags(session, row.id, data.tags)

    try:
        session.commit()
    except IntegrityError:
        # Два администратора одновременно добавили статью с одним и тем
        # же названием — редкий случай, достаточно повторить.
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Не удалось сохранить статью, попробуйте ещё раз",
        )

    session.refresh(row)

    return _article_read(row, session)


@router.put("/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: str,
    data: ArticleWrite,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ArticleRead:
    ensure_admin(current_user, "Редактировать статьи может только администратор")

    row = _get_article_or_404(article_id, session)

    images_before = referenced_images(row.body, row.cover_url)

    apply_article_write(row, data)
    session.add(row)
    replace_tags(session, row.id, data.tags)
    session.commit()
    session.refresh(row)

    # Картинки, которые убрали из текста (или заменили обложку),
    # больше никому не нужны.
    removed = images_before - referenced_images(row.body, row.cover_url)
    _delete_unreferenced_images(session, removed)

    return _article_read(row, session)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    ensure_admin(current_user, "Удалять статьи может только администратор")

    row = _get_article_or_404(article_id, session)

    images = referenced_images(row.body, row.cover_url)

    for tag_row in session.exec(
        select(ArticleTagDB).where(ArticleTagDB.article_id == row.id)
    ).all():
        session.delete(tag_row)

    session.delete(row)
    session.commit()

    _delete_unreferenced_images(session, images)


# ---------------------------------------------------------------------
# Картинки для текста и обложки. Загружаются отдельным запросом ещё до
# сохранения статьи (новой статьи, а значит и её адреса, пока может не
# быть) и возвращают адрес, который редактор вставляет в текст. Файлы,
# которые так и не попали в сохранённую статью, остаются на диске —
# убираются вручную; при редактировании и удалении статьи ненужные
# картинки удаляются сами (см. _delete_unreferenced_images).
# ---------------------------------------------------------------------


@router.post(
    "/images",
    response_model=ArticleImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_article_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ArticleImageRead:
    ensure_admin(
        current_user, "Загружать картинки статей может только администратор"
    )

    return ArticleImageRead(url=await save_image(file, MEDIA_SUBFOLDER))
