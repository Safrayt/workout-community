import math
import re
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import field_validator, model_validator
from sqlalchemy import Column, Text
from sqlmodel import Field, Session, SQLModel, select

from app.models_exercise import slugify
from app.utc import UtcDatetime


# --- Статьи (раздел "База знаний → Статьи") ----------------------------
#
# Писать статьи может только администратор (см. routers/articles.py),
# читать — все. Текст статьи — обычный Markdown, который хранится как
# есть: превращает его в разметку фронтенд (react-markdown), а не
# бэкенд. Так в базе нет ни HTML, ни связанных с ним проблем с
# безопасностью.
#
# id — человекочитаемый слаг, как у упражнений (models_exercise.py):
# на нём завязан адрес /knowledge/articles/<id>. Создаётся из названия
# при добавлении и потом не меняется, иначе сломались бы ссылки.

# Направленности статей. Ключи те же, что на фронтенде
# (constants/articleCategories.ts) — если добавить значение здесь,
# его нужно добавить и там, и наоборот. У статьи ровно одна
# направленность; хештегов может быть несколько.
ArticleCategory = Literal[
    "training",
    "nutrition",
    "recovery",
    "interview",
    "community",
]

MAX_TITLE_LENGTH = 150
MAX_SUMMARY_LENGTH = 300
MAX_BODY_LENGTH = 100_000
MAX_TAGS = 10
MAX_TAG_LENGTH = 30

# /knowledge/articles/create — страница добавления, а tags и images —
# служебные адреса API (см. routers/articles.py): статьи с такими
# слагами были бы недоступны.
RESERVED_SLUGS = {"create", "tags", "images"}

# Скорость чтения для расчёта "N мин чтения".
WORDS_PER_MINUTE = 200

# Картинки статей лежат только в uploads/articles/ и имеют имя, которое
# выдал save_image (случайный uuid + расширение из ALLOWED_IMAGE_FORMATS).
# Любой другой адрес картинки в тексте — не наш файл (см. ниже).
_IMAGE_URL_PATTERN = r"/uploads/articles/[0-9a-f]{32}\.(?:jpg|png|webp)"
ARTICLE_IMAGE_URL_RE = re.compile(_IMAGE_URL_PATTERN)

# Картинка в Markdown: ![описание](адрес "подсказка"). Берём только адрес.
_MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(\s*<?([^)\s>]+)")


class ArticleDB(SQLModel, table=True):
    __tablename__ = "article"

    id: str = Field(primary_key=True)

    title: str
    summary: str = ""
    body: str = Field(default="", sa_column=Column(Text, nullable=False))

    category: str = Field(index=True)

    # Обложка — одна из картинок, загруженных через редактор статей.
    cover_url: Optional[str] = None

    # Автор может быть удалён вместе с аккаунтом — статья при этом
    # остаётся (это контент портала, см. user_deletion.py), а автор
    # обнуляется.
    author_id: Optional[int] = Field(
        default=None, foreign_key="user.id", index=True
    )

    # Черновики видит только администратор.
    is_published: bool = Field(default=False, index=True)

    # Время первой публикации — по нему сортируется лента. Снятие с
    # публикации его не стирает: повторная публикация не "омолаживает"
    # статью.
    published_at: Optional[datetime] = None

    reading_minutes: int = 0

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ArticleTagDB(SQLModel, table=True):
    """
    Хештеги статьи — отдельная таблица, а не JSON-колонка (как списки
    у упражнений): по тегам нужно фильтровать и считать, сколько статей
    у каждого, а запросы к JSON-массиву на SQLite и PostgreSQL
    выглядят по-разному.
    """

    __tablename__ = "article_tag"

    article_id: str = Field(foreign_key="article.id", primary_key=True)
    tag: str = Field(primary_key=True, index=True)


# --- Проверка и очистка полей ------------------------------------------


def _clean_text(value: str) -> str:
    # Символ NUL PostgreSQL в текстовых полях не принимает вовсе.
    return value.replace("\x00", "").strip()


def normalize_tag(raw: str) -> str:
    """
    "  #Подтягивания Широким хватом " -> "подтягивания-широким-хватом".
    Хештег — одно слово без пробелов: пробелы заменяются дефисами,
    регистр не различается (иначе "Питание" и "питание" были бы двумя
    разными тегами). Допустимы буквы, цифры, "-" и "_".
    Бросает ValueError, если из строки не получился корректный тег.
    """
    tag = _clean_text(raw).lstrip("#").strip().lower()
    tag = re.sub(r"\s+", "-", tag)

    if not tag:
        raise ValueError("Хештег не может быть пустым")

    if len(tag) > MAX_TAG_LENGTH:
        raise ValueError(
            f"Хештег «{tag[:12]}…» длиннее {MAX_TAG_LENGTH} символов"
        )

    if not re.fullmatch(r"[\w-]+", tag):
        raise ValueError(
            f"Хештег «{tag}»: допустимы только буквы, цифры, «-» и «_»"
        )

    return tag


def try_normalize_tag(raw: str) -> Optional[str]:
    """Как normalize_tag, но для фильтров: некорректный тег -> None."""
    try:
        return normalize_tag(raw)
    except ValueError:
        return None


def referenced_images(body: str, cover_url: Optional[str]) -> set[str]:
    """Все картинки статей, на которые ссылается текст и обложка."""
    urls = {match.group(0) for match in ARTICLE_IMAGE_URL_RE.finditer(body or "")}

    if cover_url:
        urls.add(cover_url)

    return urls


def estimate_reading_minutes(body: str) -> int:
    # Адреса картинок и разметка в слова не считаются.
    text = _MARKDOWN_IMAGE_RE.sub(" ", body)
    words = len(re.findall(r"\w+", text))

    if words == 0:
        return 0

    return max(1, math.ceil(words / WORDS_PER_MINUTE))


# --- Схемы запросов и ответов ------------------------------------------


class ArticleWrite(SQLModel):
    """
    Тело запроса на добавление и на редактирование (PUT заменяет все
    поля целиком — форма на сайте всегда отправляет статью полностью).
    Слаг сюда не входит: он создаётся при добавлении и не меняется.
    """

    title: str
    summary: str = ""
    body: str = ""
    category: ArticleCategory
    tags: List[str] = []
    cover_url: Optional[str] = None
    is_published: bool = False

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str) -> str:
        value = _clean_text(value)

        if not value:
            raise ValueError("Укажите название статьи")

        if len(value) > MAX_TITLE_LENGTH:
            raise ValueError(
                f"Название не длиннее {MAX_TITLE_LENGTH} символов"
            )

        return value

    @field_validator("summary")
    @classmethod
    def _validate_summary(cls, value: str) -> str:
        value = _clean_text(value)

        if len(value) > MAX_SUMMARY_LENGTH:
            raise ValueError(
                f"Краткое описание не длиннее {MAX_SUMMARY_LENGTH} символов"
            )

        return value

    @field_validator("body")
    @classmethod
    def _validate_body(cls, value: str) -> str:
        value = _clean_text(value)

        if len(value) > MAX_BODY_LENGTH:
            raise ValueError(
                f"Текст статьи не длиннее {MAX_BODY_LENGTH} символов"
            )

        # В тексте разрешены только картинки, загруженные через
        # редактор: чужие картинки — это и пиксели слежения за
        # читателями, и файлы, которые однажды пропадут.
        for url in _MARKDOWN_IMAGE_RE.findall(value):
            if not ARTICLE_IMAGE_URL_RE.fullmatch(url):
                raise ValueError(
                    "Картинки можно вставлять только загруженные через "
                    "редактор (кнопка «Картинка»)"
                )

        return value

    @field_validator("tags")
    @classmethod
    def _validate_tags(cls, value: List[str]) -> List[str]:
        tags: List[str] = []

        for raw in value:
            if not raw or not raw.strip().lstrip("#").strip():
                # Пустое поле из формы — не ошибка, просто пропускаем.
                continue

            tag = normalize_tag(raw)

            if tag not in tags:
                tags.append(tag)

        if len(tags) > MAX_TAGS:
            raise ValueError(f"Хештегов не больше {MAX_TAGS}")

        return tags

    @field_validator("cover_url")
    @classmethod
    def _validate_cover_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not value.strip():
            return None

        if not ARTICLE_IMAGE_URL_RE.fullmatch(value.strip()):
            raise ValueError(
                "Обложкой может быть только картинка, загруженная через "
                "редактор статей"
            )

        return value.strip()

    @model_validator(mode="after")
    def _validate_publishable(self) -> "ArticleWrite":
        # Черновик можно сохранить с одним названием, а опубликовать
        # пустую статью нельзя.
        if self.is_published:
            if not self.summary:
                raise ValueError(
                    "Чтобы опубликовать статью, добавьте краткое описание"
                )

            if not self.body:
                raise ValueError(
                    "Чтобы опубликовать статью, добавьте текст"
                )

        return self


class ArticleListItem(SQLModel):
    """Статья для списка: без текста, чтобы список оставался лёгким."""

    id: str
    title: str
    summary: str
    category: str
    tags: List[str]
    cover_url: Optional[str] = None
    author_nickname: Optional[str] = None
    is_published: bool
    published_at: Optional[UtcDatetime] = None
    reading_minutes: int


class ArticleRead(ArticleListItem):
    body: str
    created_at: UtcDatetime
    updated_at: UtcDatetime


class ArticleListResponse(SQLModel):
    items: List[ArticleListItem]
    total: int
    page: int
    page_size: int


class ArticleTagCount(SQLModel):
    tag: str
    count: int


class ArticleImageRead(SQLModel):
    url: str


# --- Слаг ---------------------------------------------------------------


def make_unique_slug(session: Session, title: str) -> str:
    """
    Слаг для новой статьи из названия. Если адрес занят (или
    зарезервирован), добавляется -2, -3 и т. д.
    """
    base = slugify(title) or "article"

    candidate = base
    suffix = 2

    while (
        candidate in RESERVED_SLUGS
        or session.get(ArticleDB, candidate) is not None
    ):
        tail = f"-{suffix}"
        candidate = f"{base[: 60 - len(tail)]}{tail}"
        suffix += 1

    return candidate


# --- Преобразования -----------------------------------------------------


def apply_article_write(
    row: ArticleDB, data: ArticleWrite, now: Optional[datetime] = None
) -> None:
    """Переносит поля запроса в строку таблицы (теги — отдельно, см. replace_tags)."""
    now = now or datetime.now(timezone.utc)

    row.title = data.title
    row.summary = data.summary
    row.body = data.body
    row.category = data.category
    row.cover_url = data.cover_url
    row.reading_minutes = estimate_reading_minutes(data.body)
    row.is_published = data.is_published
    row.updated_at = now

    if data.is_published and row.published_at is None:
        row.published_at = now


def replace_tags(session: Session, article_id: str, tags: List[str]) -> None:
    """Приводит теги статьи в базе к переданному списку."""
    existing = session.exec(
        select(ArticleTagDB).where(ArticleTagDB.article_id == article_id)
    ).all()
    existing_tags = {row.tag for row in existing}

    for row in existing:
        if row.tag not in tags:
            session.delete(row)

    for tag in tags:
        if tag not in existing_tags:
            session.add(ArticleTagDB(article_id=article_id, tag=tag))
