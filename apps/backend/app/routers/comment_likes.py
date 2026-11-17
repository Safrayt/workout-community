"""
Лайки на комментариях — под записями дневника, мероприятиями, программами
и комплексами.

Комментарии лежат в четырёх разных таблицах (по одной на каждый вид, см.
CommentKind), поэтому лайки хранятся в одной общей таблице CommentLike и
ссылаются на комментарий парой (kind, comment_id).

Правила:
- ставить и снимать лайк может только вошедший пользователь, а посмотреть
  числа можно и без входа (как и сами комментарии);
- свой комментарий лайкнуть нельзя;
- лайк идемпотентен: повторный PUT ничего не меняет, DELETE без лайка
  тоже.
"""

from typing import Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user, get_optional_current_user
from app.database import get_session
from app.models import User
from app.models_complex import ComplexComment
from app.models_diary import Comment
from app.models_event import EventComment
from app.models_program import ProgramComment
from app.models_social import CommentKind, CommentLike, CommentLikeSummary
from app.rate_limit import RateLimiter

router = APIRouter(prefix="/comment-likes", tags=["comment-likes"])

# Таблица комментариев для каждого вида.
_COMMENT_MODELS = {
    CommentKind.diary: Comment,
    CommentKind.event: EventComment,
    CommentKind.program: ProgramComment,
    CommentKind.complex: ComplexComment,
}

# Лимит — на пользователя (а не на IP, как у входа): за одним IP мобильного
# оператора сидят многие, и общий лимит мешал бы честным людям.
_like_rate_limit = RateLimiter(max_requests=60, window_seconds=60)

# Сколько id комментариев передаём в один запрос «WHERE id IN (...)».
_ID_CHUNK_SIZE = 500


def _same_moment(first, second) -> bool:
    """Одно и то же время создания (в базе даты хранятся без пояса)."""
    return first.replace(tzinfo=None) == second.replace(tzinfo=None)


def _existing_comments(
    kind: CommentKind, comment_ids: Set[int], session: Session
) -> Dict[int, object]:
    """id → время создания для комментариев, которые ещё существуют."""
    model = _COMMENT_MODELS[kind]
    ids = sorted(comment_ids)
    existing: Dict[int, object] = {}

    for start in range(0, len(ids), _ID_CHUNK_SIZE):
        chunk = ids[start : start + _ID_CHUNK_SIZE]
        rows = session.exec(
            select(model.id, model.created_at).where(model.id.in_(chunk))
        ).all()

        for comment_id, created_at in rows:
            existing[comment_id] = created_at

    return existing


def _summaries(
    kind: CommentKind,
    viewer_id: Optional[int],
    session: Session,
    only_comment_id: Optional[int] = None,
) -> List[CommentLikeSummary]:
    """
    Лайки комментариев вида kind (или одного комментария): считаются
    только лайки, у которых комментарий ещё существует (см. CommentLike).
    Комментарии без лайков не возвращаются.
    """
    query = select(CommentLike).where(CommentLike.kind == kind)

    if only_comment_id is not None:
        query = query.where(CommentLike.comment_id == only_comment_id)

    likes = session.exec(query).all()

    if not likes:
        return []

    existing = _existing_comments(
        kind, {like.comment_id for like in likes}, session
    )

    counts: Dict[int, int] = {}
    liked_by_viewer: Set[int] = set()

    for like in likes:
        created_at = existing.get(like.comment_id)

        if created_at is None or not _same_moment(
            like.comment_created_at, created_at
        ):
            continue

        counts[like.comment_id] = counts.get(like.comment_id, 0) + 1

        if viewer_id is not None and like.user_id == viewer_id:
            liked_by_viewer.add(like.comment_id)

    return [
        CommentLikeSummary(
            comment_id=comment_id,
            count=count,
            liked_by_me=comment_id in liked_by_viewer,
        )
        for comment_id, count in sorted(counts.items())
    ]


def _summary_for_comment(
    kind: CommentKind, comment_id: int, viewer_id: int, session: Session
) -> CommentLikeSummary:
    found = _summaries(kind, viewer_id, session, only_comment_id=comment_id)

    return found[0] if found else CommentLikeSummary(
        comment_id=comment_id, count=0, liked_by_me=False
    )


@router.get("/{kind}", response_model=List[CommentLikeSummary])
def list_comment_likes(
    kind: CommentKind,
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
) -> List[CommentLikeSummary]:
    """
    Лайки всех комментариев этого вида: у кого сколько и, если пользователь
    вошёл, какие из них поставил он сам. Публичный — как и сами
    комментарии; отдельно списки лайков по комментариям клиент не
    запрашивает (комментарии он тоже получает все разом).
    """
    return _summaries(
        kind, current_user.id if current_user else None, session
    )


@router.put("/{kind}/{comment_id}", response_model=CommentLikeSummary)
def like_comment(
    kind: CommentKind,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CommentLikeSummary:
    key = f"user:{current_user.id}"
    _like_rate_limit.ensure_allowed(key)
    _like_rate_limit.record(key)

    comment = session.get(_COMMENT_MODELS[kind], comment_id)

    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден.",
        )

    if comment.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя поставить лайк своему комментарию.",
        )

    own_likes = session.exec(
        select(CommentLike).where(
            CommentLike.kind == kind,
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == current_user.id,
        )
    ).all()

    already_liked = False

    for like in own_likes:
        if _same_moment(like.comment_created_at, comment.created_at):
            already_liked = True
        else:
            # Лайк удалённого комментария, чей id достался этому, — мусор.
            session.delete(like)

    if not already_liked:
        session.add(
            CommentLike(
                kind=kind,
                comment_id=comment_id,
                user_id=current_user.id,
                comment_created_at=comment.created_at,
            )
        )

    session.commit()

    return _summary_for_comment(kind, comment_id, current_user.id, session)


@router.delete("/{kind}/{comment_id}", response_model=CommentLikeSummary)
def unlike_comment(
    kind: CommentKind,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CommentLikeSummary:
    key = f"user:{current_user.id}"
    _like_rate_limit.ensure_allowed(key)
    _like_rate_limit.record(key)

    own_likes = session.exec(
        select(CommentLike).where(
            CommentLike.kind == kind,
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == current_user.id,
        )
    ).all()

    for like in own_likes:
        session.delete(like)

    session.commit()

    return _summary_for_comment(kind, comment_id, current_user.id, session)
