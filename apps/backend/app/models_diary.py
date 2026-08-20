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


class WorkoutEntry(WorkoutEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")
    playground_id: Optional[int] = Field(
        default=None, foreign_key="playground.id"
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    photos: List["WorkoutEntryPhoto"] = Relationship(
        back_populates="entry"
    )


class WorkoutEntryCreate(WorkoutEntryBase):
    playground_id: Optional[int] = None


class WorkoutEntryUpdate(SQLModel):
    """Все поля необязательны — обновляем только то, что передано."""

    date: Optional[date_type] = None
    time_of_day: Optional[TimeOfDay] = None
    playground_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


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
    created_at: datetime
    photos: List[WorkoutEntryPhotoRead] = []


# --- Заметка дневника -------------------------------------------------------

class DiaryNoteBase(SQLModel):
    title: Optional[str] = None
    text: str
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))


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
