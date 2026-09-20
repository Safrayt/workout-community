import enum
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

# --- Раздел «Программы» --------------------------------------------------
#
# См. UX-документ «Раздел Программы». Главный принцип оттуда: система
# даёт структуру, но не пытается интерпретировать авторскую методику
# (п.1) — поэтому всё содержимое схем/блоков/упражнений ниже это
# свободный текст и порядок, заданный автором, без попыток что-то
# распознать или провалидировать по смыслу.
#
# Программа (ProgramDB) и её версия (ProgramVersionDB) — разные
# сущности (п.2 документа): программа — постоянная, версия — снимок
# содержимого на конкретный момент. Опубликованные версии неизменяемы
# (п.5 UX-принципов), поэтому редактирование всегда идёт через
# отдельную черновую версию, а не поверх опубликованной.


class ProgramDifficulty(str, enum.Enum):
    """
    Уровень сложности — единственное поле программы, где система
    всё-таки просит выбрать значение из списка, а не свободный текст.
    Это метаданные для фильтра каталога (как ComplexType/MovementType
    у комплексов), а не попытка анализировать содержимое программы —
    значение выбирает сам автор, система его не вычисляет.
    """

    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class ProgramVersionStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


# --- Структура версии (п.10-17 документа) --------------------------------
#
# Хранится в ProgramVersionDB.structure одним JSON-полем: это вложенная
# структура произвольной глубины, которую нельзя разумно разложить на
# нормализованные таблицы, не создав кучу join'ов ради данных, которые
# всегда запрашиваются и сохраняются только целиком, вместе со своей
# версией (та же логика, что у ComplexDB.star_conditions в
# models_complex.py). Классы ниже — не таблицы, а форма для
# валидации/сериализации этого JSON.


class ProgramBlock(SQLModel):
    """
    Блок — минимальная структурированная часть схемы (п.12-17).
    В интерфейсе называется "Комплекс" — это тот же элемент структуры,
    просто более привычное для тренирующихся слово; на бэкенде и в
    хранимых данных название поля не меняем, чтобы не городить лишнюю
    миграцию ради переименования.
    Ровно как в документе: название обязательно, всё остальное —
    необязательный свободный текст. id — сгенерированная на фронтенде
    строка для стабильных React-ключей при редактировании порядка,
    бэкенд её не осмысливает и просто хранит.
    """

    id: Optional[str] = None
    title: str
    # Порядок упражнений — часть авторского ввода (п.15): именно
    # порядок элементов этого списка и есть порядок, который увидят
    # пользователи. Система не делает из него вывод о том, что
    # упражнения выполняются последовательно, круговой тренировке и т.п.
    exercises: List[str] = []
    # "Схема / описание выполнения блока" (п.16) — свободный текст,
    # например "5 × 10" или "4 круга по 10+5+5".
    scheme: Optional[str] = None
    # Примечание автора к блоку (п.17).
    note: Optional[str] = None
    # Отдых между подходами/блоками — тоже свободный текст автора
    # (например, "60-90 секунд" или "полное восстановление"), система
    # не пытается парсить это как число секунд.
    rest: Optional[str] = None


class ProgramScheme(SQLModel):
    """Тренировочная схема — одна тренировочная последовательность (п.11)."""

    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    blocks: List[ProgramBlock] = []
    note: Optional[str] = None
    # "Дополнительные материалы" (п.11) — необязательная ссылка/текст
    # (например, ссылка на видео с пояснением схемы).
    extra_materials: Optional[str] = None


class ProgramSection(SQLModel):
    """
    Раздел — необязательный уровень вложенности (п.10, вариант 3:
    "Неделя 1", "Цикл 1" и т.п. — названия не стандартизируются).
    Когда автор не использует разделы (варианты 1-2 из п.10), версия
    хранит ровно один ProgramSection с name=None — это внутреннее
    представление, на фронтенде такой раздел не показывается как
    отдельный уровень, схемы отображаются сразу под программой.
    """

    id: Optional[str] = None
    name: Optional[str] = None
    schemes: List[ProgramScheme] = []


class ProgramStructure(SQLModel):
    """Структура текущей версии целиком (правая ветка схемы в п.2)."""

    sections: List[ProgramSection] = []


def empty_structure() -> dict:
    return ProgramStructure().model_dump(mode="json")


# --- Программа (постоянная сущность, п.2) ---------------------------------


class ProgramBase(SQLModel):
    title: str
    description: str = ""
    cover_url: Optional[str] = None
    difficulty: Optional[ProgramDifficulty] = None


class ProgramDB(ProgramBase, table=True):
    __tablename__ = "program"

    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")

    # Кэш двух вещей, которые иначе пришлось бы каждый раз вычислять
    # join'ом по programversion: видна ли программа кому-то, кроме
    # автора (см. п.3 — черновик не публикуется, значит и в каталоге
    # его быть не должно), и какая версия сейчас "текущая" для показа
    # (п.6 — "Текущая версия: 1.2"). Обновляются оба поля в момент
    # публикации версии (см. publish_draft в routers/programs.py) и
    # нигде больше не пишутся.
    is_published: bool = False
    current_version_id: Optional[int] = Field(
        default=None, foreign_key="programversion.id"
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ProgramCreate(ProgramBase):
    """
    Создание программы сразу заводит и саму программу, и её первую
    черновую версию (см. create_program в routers/programs.py) — по
    сценарию из п.20 документа ("Создание программы → Черновик").
    """

    pass


class ProgramUpdate(SQLModel):
    """
    Только "информация о программе" (п.2) — название, описание,
    обложка, сложность. Структура версии редактируется отдельными
    эндпоинтами про черновик, не через этот метод.
    """

    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    difficulty: Optional[ProgramDifficulty] = None


class ProgramRead(ProgramBase):
    id: int
    author_id: int
    is_published: bool
    current_version_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Посчитанные на момент запроса, не хранятся в таблице (п.8: и
    # "тренировок по программе", и избранное — это просто счётчики
    # существующих связанных записей, отдельного состояния у них нет).
    trainings_count: int = 0
    favorites_count: int = 0

    # Для карточки/страницы программы, чтобы не делать отдельный
    # запрос об авторе — только то, что и так публично на портале.
    author_nickname: str = ""
    author_avatar_url: Optional[str] = None

    # Личное отношение текущего пользователя к программе — не имеет
    # смысла для анонимного просмотра, тогда всегда False (см.
    # get_program в routers/programs.py).
    is_favorited_by_viewer: bool = False


# --- Версия программы (снимок содержимого, п.2-6) --------------------------


class ProgramVersionBase(SQLModel):
    structure: dict = Field(default_factory=empty_structure, sa_column=Column(JSON))


class ProgramVersionDB(ProgramVersionBase, table=True):
    __tablename__ = "programversion"

    id: Optional[int] = Field(default=None, primary_key=True)
    program_id: int = Field(foreign_key="program.id")

    status: str = ProgramVersionStatus.draft.value

    # Присваивается только при публикации (п.4) — у черновика всегда
    # None, у него ещё нет номера, который можно было бы кому-то
    # показать.
    version_number: Optional[str] = None

    # "Комментарий автора об изменениях" (п.4) — для самой первой
    # публикации необязателен (ещё нечего сравнивать), для всех
    # последующих требуется явно (проверяется в роутере, не здесь).
    changelog: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    published_at: Optional[datetime] = None


class ProgramVersionRead(ProgramVersionBase):
    id: int
    program_id: int
    status: ProgramVersionStatus
    version_number: Optional[str] = None
    changelog: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None


class ProgramVersionSummary(SQLModel):
    """
    Для списка версий программы (п.4.1 "Исторические версии") —
    без структуры целиком, чтобы не тащить весь JSON ради списка на
    странице истории.
    """

    id: int
    version_number: Optional[str] = None
    changelog: Optional[str] = None
    published_at: Optional[datetime] = None


def bump_version_number(previous: Optional[str], *, major: bool = False) -> str:
    """
    Следующий номер версии (п.4: "конкретная логика увеличения номера
    может быть определена отдельно" — документ сознательно оставляет
    это на усмотрение реализации). По умолчанию — минорный шаг
    (1.0 → 1.1), major=True — старший шаг с обнулением минорного
    (1.2 → 2.0), для самой первой публикации previous=None → "1.0".
    """
    if previous is None:
        return "1.0"

    try:
        major_part, minor_part = previous.split(".")
        major_number, minor_number = int(major_part), int(minor_part)
    except (ValueError, AttributeError):
        # Не должно происходить для номеров, выданных этой же функцией,
        # но на всякий случай не роняем публикацию из-за формата.
        return "1.0"

    if major:
        return f"{major_number + 1}.0"

    return f"{major_number}.{minor_number + 1}"


# --- Избранное (п.9) -------------------------------------------------------


class ProgramFavorite(SQLModel, table=True):
    """
    Как PlaygroundFavorite в models_social.py: пара пользователь-
    программа. Намеренно НЕ является признаком "прохождения" программы
    (п.9: "избранное и использование программы — независимые
    действия") — отсюда никак не считается статистика тренировок.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    program_id: int = Field(foreign_key="program.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ProgramFavoriteRead(SQLModel):
    id: int
    user_id: int
    program_id: int
    created_at: datetime


# --- Комментарии (п.19) -----------------------------------------------------
#
# Как и у комплексов (ComplexComment) — обсуждение живёт отдельно от
# официального содержимого и никогда его не меняет (п.19: "комментарии
# не изменяют саму программу").


class ProgramCommentBase(SQLModel):
    text: str


class ProgramComment(ProgramCommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    program_id: int = Field(foreign_key="program.id")
    user_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ProgramCommentCreate(ProgramCommentBase):
    pass


class ProgramCommentRead(ProgramCommentBase):
    id: int
    program_id: int
    user_id: int
    created_at: datetime
