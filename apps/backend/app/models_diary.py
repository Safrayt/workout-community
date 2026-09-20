import enum
from datetime import date as date_type
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel


# --- Общее для дневника --------------------------------------------------

class TimeOfDay(str, enum.Enum):
    morning = "morning"
    day = "day"
    evening = "evening"
    night = "night"


class DiaryRecordType(str, enum.Enum):
    """
    Используется в Comment, чтобы один и тот же комментарий мог
    ссылаться либо на запись тренировки, либо на заметку — record_id
    сам по себе не однозначен без этого поля (это не настоящий
    внешний ключ, а "полиморфная" ссылка, как recordId+recordType
    на фронтенде в types/comment.ts).
    """

    workout = "workout"
    note = "note"


# --- Запись тренировки -----------------------------------------------------

class WorkoutEntryBase(SQLModel):
    date: date_type
    time_of_day: Optional[TimeOfDay] = None
    title: str
    description: str = ""

    # Свободные теги пользователя — как и equipment у Playground,
    # проще хранить прямо списком строк в JSON-колонке, чем городить
    # отдельную таблицу связи с PersonalTag. Реестр личных тегов
    # (PersonalTag) при этом отдельно синхронизируется в
    # routers/diary.py при создании/изменении записи.
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    # Приватность записи — независимо от общей настройки видимости
    # дневника (User.diary_visible), у каждой отдельной записи можно
    # сузить её собственную видимость дальше:
    #   • hide_from_feed — не показывать во вкладке "Все записи" на
    #     Главной. Запись остаётся видна во вкладке "Подписки" (тем,
    #     кто подписан на автора) и на странице дневника автора.
    #   • is_private — не показывать вообще нигде в общей ленте (ни
    #     "Все записи", ни "Подписки") и на странице дневника автора
    #     для кого угодно, кроме самого автора и администратора.
    # is_private жёстче hide_from_feed и уже включает его действие —
    # оба флага можно выставить одновременно, но это избыточно.
    hide_from_feed: bool = False
    is_private: bool = False


class WorkoutEntry(WorkoutEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")
    playground_id: Optional[int] = Field(
        default=None, foreign_key="playground.id"
    )

    # Связь с программой (см. UX-документ «Раздел Программы», п.5) —
    # в отличие от связи с комплексом (ComplexCompletion.diary_entry_id
    # в models_complex.py, обратная ссылка), здесь это прямые поля на
    # самой записи: документ описывает программу как то, что "в записи
    # он может указать" — то есть атрибут записи, а не отдельная
    # сущность "прохождение", которая может существовать сама по себе.
    #
    # program_version_id фиксируется в момент создания/привязки записи
    # (п.6: "фиксация версии") и НИКОГДА не пересчитывается
    # автоматически при выходе новой версии программы (п.6, п.5 —
    # "старая запись дневника не должна автоматически переходить на
    # новую версию"). section/scheme — свободный текст названий, а не
    # ссылки на элементы структуры версии, потому что сами названия
    # не стандартизируются (п.10) и могут не совпадать в старой и
    # новой версии программы.
    program_id: Optional[int] = Field(default=None, foreign_key="program.id")
    program_version_id: Optional[int] = Field(
        default=None, foreign_key="programversion.id"
    )
    program_section: Optional[str] = None
    program_scheme: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    photos: List["WorkoutEntryPhoto"] = Relationship(
        back_populates="entry"
    )


class WorkoutEntryCreate(WorkoutEntryBase):
    playground_id: Optional[int] = None

    # program_version_id сюда намеренно не входит — клиент указывает
    # только программу и (опционально) раздел/схему, версию сервер
    # подставляет сам как текущую опубликованную (п.7 MVP: "выбор
    # версии автоматически"), см. resolve_program_link в
    # routers/programs.py.
    program_id: Optional[int] = None
    program_section: Optional[str] = None
    program_scheme: Optional[str] = None


class WorkoutEntryUpdate(SQLModel):
    """Все поля необязательны — обновляем только то, что передано."""

    date: Optional[date_type] = None
    time_of_day: Optional[TimeOfDay] = None
    playground_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    hide_from_feed: Optional[bool] = None
    is_private: Optional[bool] = None

    program_id: Optional[int] = None
    program_section: Optional[str] = None
    program_scheme: Optional[str] = None

    # Как clear_diary_entry у ComplexCompletionUpdate в
    # models_complex.py: JSON null не отличить от "поле не передано"
    # при exclude_unset, поэтому отвязка программы — отдельный явный
    # флаг, а не program_id=null.
    clear_program: bool = False


class WorkoutEntryPhoto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="workoutentry.id")
    url: str
    is_main: bool = False

    entry: Optional[WorkoutEntry] = Relationship(back_populates="photos")


class WorkoutEntryPhotoRead(SQLModel):
    id: int
    url: str
    is_main: bool


class WorkoutEntryRead(WorkoutEntryBase):
    id: int
    user_id: int
    playground_id: Optional[int] = None
    program_id: Optional[int] = None
    program_version_id: Optional[int] = None
    program_section: Optional[str] = None
    program_scheme: Optional[str] = None
    created_at: datetime
    photos: List[WorkoutEntryPhotoRead] = []


# --- Заметка дневника -------------------------------------------------------

class DiaryNoteBase(SQLModel):
    title: Optional[str] = None
    text: str
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    # См. подробный комментарий у WorkoutEntryBase — та же механика.
    hide_from_feed: bool = False
    is_private: bool = False


class DiaryNote(DiaryNoteBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")
    playground_id: Optional[int] = Field(
        default=None, foreign_key="playground.id"
    )

    # Дата заметки фиксируется в момент создания (сегодняшняя дата) и
    # дальше не меняется при редактировании — так же ведёт себя
    # DiaryNotesContext.addNote/updateNote на фронтенде: date задаётся
    # только при создании, buildNoteFields в update его не трогает.
    date: date_type = Field(
        default_factory=lambda: datetime.now(timezone.utc).date()
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    photos: List["DiaryNotePhoto"] = Relationship(back_populates="note")


class DiaryNoteCreate(DiaryNoteBase):
    playground_id: Optional[int] = None


class DiaryNoteUpdate(SQLModel):
    """
    Дату здесь намеренно нет — см. комментарий у DiaryNote.date.
    Остальные поля необязательны — обновляем только переданное.
    """

    title: Optional[str] = None
    text: Optional[str] = None
    playground_id: Optional[int] = None
    tags: Optional[List[str]] = None
    hide_from_feed: Optional[bool] = None
    is_private: Optional[bool] = None


class DiaryNotePhoto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    note_id: int = Field(foreign_key="diarynote.id")
    url: str
    is_main: bool = False

    note: Optional[DiaryNote] = Relationship(back_populates="photos")


class DiaryNotePhotoRead(SQLModel):
    id: int
    url: str
    is_main: bool


class DiaryNoteRead(DiaryNoteBase):
    id: int
    user_id: int
    playground_id: Optional[int] = None
    date: date_type
    created_at: datetime
    photos: List[DiaryNotePhotoRead] = []


# --- Личные теги --------------------------------------------------------

class PersonalTagBase(SQLModel):
    name: str


class PersonalTag(PersonalTagBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class PersonalTagCreate(PersonalTagBase):
    pass


class PersonalTagUpdate(SQLModel):
    name: str


class PersonalTagRead(PersonalTagBase):
    id: int
    user_id: int
    created_at: datetime


# --- Комментарии к записям дневника ----------------------------------------

class CommentBase(SQLModel):
    text: str


class Comment(CommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    record_id: int
    record_type: DiaryRecordType
    user_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CommentCreate(CommentBase):
    pass


class CommentRead(CommentBase):
    id: int
    record_id: int
    record_type: DiaryRecordType
    user_id: int
    created_at: datetime


# --- Карта активности (полностью анонимная агрегация) ----------------------

class ActivityMapMarker(SQLModel):
    """
    Полностью анонимная агрегированная активность на одной площадке —
    только "здесь недавно кто-то тренировался", без какой-либо
    привязки к конкретному пользователю или содержимого самой записи.
    Специально не содержит user_id/title/text и т.п. — см. GET
    /diary/activity-map в routers/diary.py, зачем это отдельный
    эндпоинт, а не смягчение фильтров в основном списке записей.
    """

    playground_id: int
    workout_count: int
    note_count: int
    last_activity_at: datetime
