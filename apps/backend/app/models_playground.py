import enum
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel


class PlaygroundSize(str, enum.Enum):
    small = "small"
    medium = "medium"
    large = "large"


class PlaygroundSurface(str, enum.Enum):
    rubber = "rubber"
    asphalt = "asphalt"
    concrete = "concrete"
    gravel = "gravel"
    mulch = "mulch"
    sand = "sand"
    ground = "ground"
    mixed = "mixed"


class PlaygroundAccess(str, enum.Enum):
    free = "free"
    limited = "limited"


class PlaygroundCondition(str, enum.Enum):
    acceptable = "acceptable"
    needs_repair = "needsRepair"
    unusable = "unusable"


class PlaygroundEquipment(str, enum.Enum):
    """
    Значения совпадают строка-в-строку с фронтендом (types/playground.ts),
    чтобы данные из формы на фронте проходили валидацию как есть,
    без дополнительного преобразования.
    """

    wide_pull_bar = "widePullBar"
    high_pull_bar = "highPullBar"
    medium_pull_bar = "mediumPullBar"
    low_pull_bar = "lowPullBar"
    middle_push_bar = "middlePushBar"
    low_push_bar = "lowPushBar"
    labyrinth = "labyrinth"
    high_parallel_bars = "highParallelBars"
    medium_parallel_bars = "mediumParallelBars"
    parallettes = "parallettes"
    push_up_bars = "pushUpBars"
    wide_monkey_bars = "wideMonkeyBars"
    narrow_monkey_bars = "narrowMonkeyBars"
    swedish_wall = "swedishWall"
    bench = "Bench"
    incline_bench = "inclineBench"
    posts = "posts"
    rings = "rings"
    rope = "rope"


class PlaygroundHistoryEntryType(str, enum.Enum):
    """Совпадает построчно с PlaygroundHistoryEntryType на фронтенде."""

    created = "created"
    inspection = "inspection"
    edit = "edit"


class PlaygroundHistoryEntry(SQLModel, table=True):
    """
    Одна запись в истории площадки: "добавлена", "проверена" или
    "изменена". changed_fields заполняется только для type == "edit" —
    список человекочитаемых названий полей (см. CHANGED_FIELD_LABELS
    в routers/playgrounds.py), в остальных случаях остаётся None.

    username в истории не хранится — при чтении подставляется из
    связанного User (см. _to_playground_read в routers/playgrounds.py),
    как и expected_participants в EventRead.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    playground_id: int = Field(foreign_key="playground.id")
    user_id: int = Field(foreign_key="user.id")

    type: PlaygroundHistoryEntryType
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    changed_fields: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSON),
    )

    playground: Optional["Playground"] = Relationship(
        back_populates="history"
    )


class PlaygroundHistoryEntryRead(SQLModel):
    id: int
    type: PlaygroundHistoryEntryType
    date: datetime
    user_id: int
    username: str
    changed_fields: Optional[List[str]] = None


# --- Фотографии площадки ---------------------------------------------------

class PlaygroundPhotoBase(SQLModel):
    url: str
    description: Optional[str] = None
    is_main: bool = False


class PlaygroundPhoto(PlaygroundPhotoBase, table=True):
    """
    Каждая строка — одна фотография, привязанная к конкретной площадке
    через playground_id (внешний ключ). Так у одной площадки может быть
    много фотографий — это называется связь "один ко многим".
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    playground_id: int = Field(foreign_key="playground.id")

    playground: Optional["Playground"] = Relationship(
        back_populates="photos"
    )


class PlaygroundPhotoCreate(PlaygroundPhotoBase):
    """То, что клиент присылает при добавлении фотографии."""


class PlaygroundPhotoRead(PlaygroundPhotoBase):
    """То, что возвращаем клиенту — с уже присвоенным id."""

    id: int
    playground_id: int


# --- Площадка ---------------------------------------------------------------

class PlaygroundBase(SQLModel):
    name: str
    locality: str
    address: str

    # Координаты храним как два отдельных числа, а не вложенный объект —
    # реляционные таблицы не умеют хранить вложенные структуры напрямую,
    # только плоские колонки.
    latitude: float
    longitude: float

    size: PlaygroundSize
    surface: PlaygroundSurface
    access: PlaygroundAccess
    # Заполняется только когда access == "limited" (например,
    # "территория школы, только в будни после 18:00"). Логика этого
    # условия — забота фронтенда, бэкенд поле не валидирует.
    access_restrictions: Optional[str] = None
    condition: PlaygroundCondition
    opening_hours: str
    description: str = ""

    # PlaygroundAmenities с фронтенда — тоже вложенный объект,
    # по той же причине "распрямляем" его в отдельные колонки.
    lighting: bool = False
    covered: bool = False
    changing_room: bool = False
    toilet: bool = False
    drinking_water: bool = False
    shower: bool = False
    parking: bool = False
    bicycle_parking: bool = False
    trash_bins: bool = False
    shade: bool = False


class Playground(PlaygroundBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Пользователь, который добавил площадку. Нужен, чтобы разрешать
    # редактирование/удаление только владельцу.
    creator_id: int = Field(foreign_key="user.id")

    # Список оборудования храним как JSON-массив строк в одной колонке.
    # Проще, чем отдельная таблица-справочник. Оговорка: искать средствами
    # SQL "все площадки с определённым турником" так неудобно — если такой
    # поиск понадобится на бэкенде, вынесем в отдельную таблицу.
    equipment: List[PlaygroundEquipment] = Field(
        default_factory=list,
        sa_column=Column(JSON),
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    # Обновляется вручную в routers/playgrounds.py при каждом PUT —
    # SQLModel сам это не отслеживает, в отличие от created_at.
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    photos: List[PlaygroundPhoto] = Relationship(
        back_populates="playground"
    )
    history: List[PlaygroundHistoryEntry] = Relationship(
        back_populates="playground"
    )


class PlaygroundCreate(PlaygroundBase):
    """
    Данные для создания площадки. Фотографии сюда не входят —
    их добавляют отдельным запросом на /playgrounds/{id}/photos
    уже после создания самой площадки (см. routers/playgrounds.py).
    """

    equipment: List[PlaygroundEquipment] = []


class PlaygroundUpdate(SQLModel):
    """
    Все поля необязательны: при обновлении можно прислать только то,
    что реально меняется, а не всю площадку целиком.
    Фотографии здесь не редактируются — для них сделаем отдельные
    эндпоинты на следующем шаге (загрузка/удаление отдельного файла).
    """

    name: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    size: Optional[PlaygroundSize] = None
    surface: Optional[PlaygroundSurface] = None
    access: Optional[PlaygroundAccess] = None
    access_restrictions: Optional[str] = None
    condition: Optional[PlaygroundCondition] = None
    opening_hours: Optional[str] = None
    description: Optional[str] = None
    lighting: Optional[bool] = None
    covered: Optional[bool] = None
    changing_room: Optional[bool] = None
    toilet: Optional[bool] = None
    drinking_water: Optional[bool] = None
    shower: Optional[bool] = None
    parking: Optional[bool] = None
    bicycle_parking: Optional[bool] = None
    trash_bins: Optional[bool] = None
    shade: Optional[bool] = None
    equipment: Optional[List[PlaygroundEquipment]] = None


class PlaygroundRead(PlaygroundBase):
    id: int
    creator_id: int
    equipment: List[PlaygroundEquipment]
    created_at: datetime
    updated_at: datetime
    photos: List[PlaygroundPhotoRead] = []
    history: List[PlaygroundHistoryEntryRead] = []
