import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import field_validator, model_validator
from sqlalchemy import JSON, Column
from sqlmodel import Field, Session, SQLModel, select


# --- База упражнений ---------------------------------------------------
#
# Упражнения с собственным весом (раздел "База знаний → Упражнения").
# Как и каталог комплексов (models_complex.py), раньше жили в коде
# фронтенда, а теперь — настоящая таблица, чтобы администратор мог
# добавлять и править их через сайт. id — человекочитаемый слаг
# (например, "pillar-pull-ups"): на нём завязан адрес страницы
# /knowledge/exercises/<id>. Слаг создаётся автоматически из названия при
# добавлении и потом не меняется — иначе сломались бы ссылки на
# упражнение.

# Типы движения и мышечные группы — те же ключи, что на фронтенде
# (types/exercise.ts, constants/movementTypes.ts, constants/muscleGroups.ts).
# Если здесь добавить значение, его нужно добавить и там — и наоборот.
MovementType = Literal[
    "pull",
    "push",
    "abduction",
    "crunch",
    "kneeDominant",
    "hipDominant",
    "ankleExtension",
]

MuscleGroup = Literal[
    "pecMajor",
    "upperChest",
    "frontDelts",
    "sideDelts",
    "rearDelts",
    "biceps",
    "triceps",
    "forearms",
    "upperTrapezius",
    "lowerTrapezius",
    "lats",
    "spinalErectors",
    "abs",
    "obliques",
    "iliacus",
    "glutes",
    "quads",
    "hamstrings",
    "calves",
]

# Пределы длины — чтобы одна ошибка (или вставка целой статьи в поле
# названия) не раздула страницу и базу.
MAX_NAME_LENGTH = 120
MAX_DESCRIPTION_LENGTH = 2000
MAX_ITEM_LENGTH = 500
MAX_LIST_ITEMS = 20

# Адрес /knowledge/exercises/create — это страница добавления, а не
# упражнение: слаг "create" занимать нельзя.
RESERVED_SLUGS = {"create"}


class ExerciseDB(SQLModel, table=True):
    """
    Таблица упражнений. Списки хранятся JSON-колонками (по той же
    причине, что и в ComplexDB: это короткие списки, которые никогда
    не запрашиваются отдельно от своего упражнения).
    """

    __tablename__ = "exercise"

    id: str = Field(primary_key=True)

    # Порядок в списке без фильтров: стартовые упражнения идут в том
    # порядке, в каком заданы в exercise_seed.json, новые — в конец.
    position: int = 0

    name: str
    name_en: Optional[str] = None
    movement_type: str

    target_muscles: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    auxiliary_muscles: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    equipment: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    description: str = ""
    advantages: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    disadvantages: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    technique: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    features: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    suitable_for: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    # Ссылки на файлы. Загруженные через сайт лежат в /uploads/exercises/
    # (их можно удалять вместе с упражнением); стартовые указывают на
    # статику фронтенда (/exercises/...) — её бэкенд не трогает.
    photo_url: Optional[str] = None
    video_url: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


def _clean_text(value: str) -> str:
    return value.strip()


def _clean_items(value: List[str], field_label: str) -> List[str]:
    """Обрезает пробелы, выбрасывает пустые пункты, проверяет длину."""
    cleaned = [item.strip() for item in value if item and item.strip()]

    if len(cleaned) > MAX_LIST_ITEMS:
        raise ValueError(
            f"{field_label}: не больше {MAX_LIST_ITEMS} пунктов"
        )

    for item in cleaned:
        if len(item) > MAX_ITEM_LENGTH:
            raise ValueError(
                f"{field_label}: пункт длиннее {MAX_ITEM_LENGTH} символов"
            )

    return cleaned


class ExerciseWrite(SQLModel):
    """
    Тело запроса на добавление и на редактирование (PUT заменяет все
    перечисленные поля целиком — форма на сайте всегда отправляет
    упражнение полностью). Фото и видео сюда намеренно не входят: они
    загружаются отдельными запросами (см. routers/exercises.py) и при
    редактировании текста остаются как были.
    """

    name: str
    name_en: Optional[str] = None
    movement_type: MovementType

    target_muscles: List[MuscleGroup]
    auxiliary_muscles: List[MuscleGroup] = []
    equipment: List[str]

    description: str
    advantages: List[str] = []
    disadvantages: List[str] = []
    technique: List[str]
    features: List[str] = []
    suitable_for: List[str] = []

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        value = _clean_text(value)

        if not value:
            raise ValueError("Укажите название упражнения")

        if len(value) > MAX_NAME_LENGTH:
            raise ValueError(
                f"Название не длиннее {MAX_NAME_LENGTH} символов"
            )

        return value

    @field_validator("name_en")
    @classmethod
    def _validate_name_en(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        value = _clean_text(value)

        if len(value) > MAX_NAME_LENGTH:
            raise ValueError(
                f"Название на английском не длиннее {MAX_NAME_LENGTH} символов"
            )

        # Пустая строка из формы — то же самое, что "не указано".
        return value or None

    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: str) -> str:
        value = _clean_text(value)

        if not value:
            raise ValueError("Заполните блок «Что это такое?»")

        if len(value) > MAX_DESCRIPTION_LENGTH:
            raise ValueError(
                f"Описание не длиннее {MAX_DESCRIPTION_LENGTH} символов"
            )

        return value

    @field_validator("target_muscles", "auxiliary_muscles")
    @classmethod
    def _dedupe_muscles(cls, value: List[str]) -> List[str]:
        # dict.fromkeys убирает повторы, сохраняя порядок.
        return list(dict.fromkeys(value))

    @field_validator("equipment")
    @classmethod
    def _validate_equipment(cls, value: List[str]) -> List[str]:
        cleaned = _clean_items(value, "Оборудование")

        if not cleaned:
            raise ValueError(
                "Укажите оборудование (например, «Без оборудования»)"
            )

        return cleaned

    @field_validator("technique")
    @classmethod
    def _validate_technique(cls, value: List[str]) -> List[str]:
        cleaned = _clean_items(value, "Техника выполнения")

        if not cleaned:
            raise ValueError("Добавьте хотя бы один шаг техники выполнения")

        return cleaned

    @field_validator("advantages")
    @classmethod
    def _validate_advantages(cls, value: List[str]) -> List[str]:
        return _clean_items(value, "Преимущества")

    @field_validator("disadvantages")
    @classmethod
    def _validate_disadvantages(cls, value: List[str]) -> List[str]:
        return _clean_items(value, "Недостатки")

    @field_validator("features")
    @classmethod
    def _validate_features(cls, value: List[str]) -> List[str]:
        return _clean_items(value, "Особенности")

    @field_validator("suitable_for")
    @classmethod
    def _validate_suitable_for(cls, value: List[str]) -> List[str]:
        return _clean_items(value, "Для кого подходит")

    @model_validator(mode="after")
    def _validate_muscles(self) -> "ExerciseWrite":
        if not self.target_muscles:
            raise ValueError("Выберите хотя бы одну целевую мышцу")

        overlap = set(self.target_muscles) & set(self.auxiliary_muscles)

        if overlap:
            raise ValueError(
                "Одна и та же мышца не может быть и целевой, и вспомогательной"
            )

        return self


class ExerciseRead(SQLModel):
    id: str
    name: str
    name_en: Optional[str] = None
    movement_type: str

    target_muscles: List[str]
    auxiliary_muscles: List[str]
    equipment: List[str]

    description: str
    advantages: List[str]
    disadvantages: List[str]
    technique: List[str]
    features: List[str]
    suitable_for: List[str]

    photo_url: Optional[str] = None
    video_url: Optional[str] = None


# --- Адрес (слаг) из названия ------------------------------------------

_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}

MAX_SLUG_LENGTH = 60


def slugify(name: str) -> str:
    """
    "Подтягивания к столбу" -> "podtyagivaniya-k-stolbu". Только строчные
    латинские буквы, цифры и дефисы: такой адрес безопасно вставлять в
    URL и в имена файлов.
    """
    transliterated = "".join(
        _TRANSLIT.get(char, char) for char in name.lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", transliterated).strip("-")

    return slug[:MAX_SLUG_LENGTH].strip("-")


def make_unique_slug(session: Session, name: str, name_en: Optional[str]) -> str:
    """
    Слаг для нового упражнения: из английского названия, если оно есть
    (оно обычно короче и привычнее в адресе), иначе из русского. Если
    такой адрес занят (или зарезервирован), добавляется -2, -3 и т. д.
    """
    base = slugify(name_en or "") or slugify(name) or "exercise"

    candidate = base
    suffix = 2

    while (
        candidate in RESERVED_SLUGS
        or session.get(ExerciseDB, candidate) is not None
    ):
        tail = f"-{suffix}"
        candidate = f"{base[: MAX_SLUG_LENGTH - len(tail)]}{tail}"
        suffix += 1

    return candidate


# --- Преобразования -----------------------------------------------------


def exercise_from_db(row: ExerciseDB) -> ExerciseRead:
    return ExerciseRead(
        id=row.id,
        name=row.name,
        name_en=row.name_en,
        movement_type=row.movement_type,
        target_muscles=list(row.target_muscles or []),
        auxiliary_muscles=list(row.auxiliary_muscles or []),
        equipment=list(row.equipment or []),
        description=row.description,
        advantages=list(row.advantages or []),
        disadvantages=list(row.disadvantages or []),
        technique=list(row.technique or []),
        features=list(row.features or []),
        suitable_for=list(row.suitable_for or []),
        photo_url=row.photo_url,
        video_url=row.video_url,
    )


def apply_exercise_write(row: ExerciseDB, data: ExerciseWrite) -> None:
    row.name = data.name
    row.name_en = data.name_en
    row.movement_type = data.movement_type
    row.target_muscles = list(data.target_muscles)
    row.auxiliary_muscles = list(data.auxiliary_muscles)
    row.equipment = list(data.equipment)
    row.description = data.description
    row.advantages = list(data.advantages)
    row.disadvantages = list(data.disadvantages)
    row.technique = list(data.technique)
    row.features = list(data.features)
    row.suitable_for = list(data.suitable_for)
    row.updated_at = datetime.now(timezone.utc)


# --- Стартовые данные ---------------------------------------------------

SEED_FILE = Path(__file__).with_name("exercise_seed.json")


def load_seed_exercises() -> List[dict]:
    with SEED_FILE.open(encoding="utf-8") as file:
        return json.load(file)


def seed_exercises_if_empty(session: Session) -> None:
    """
    Заполняет таблицу exercise стартовыми упражнениями, но только если
    она ещё совсем пуста — как seed_complexes_if_empty: ничего не
    трогает, если администратор уже что-то добавил или удалил.
    Вызывается один раз при старте (см. database.create_db_and_tables).

    Единственный нюанс: если администратор удалит ВСЕ упражнения, при
    следующем перезапуске сервера стартовые вернутся — таблица снова
    окажется пустой.
    """
    if session.exec(select(ExerciseDB)).first() is not None:
        return

    for position, seed in enumerate(load_seed_exercises()):
        # Через ExerciseWrite — чтобы стартовые данные проходили ту же
        # проверку, что и введённые вручную (см. тесты).
        data = ExerciseWrite(
            **{key: seed[key] for key in ExerciseWrite.model_fields}
        )

        row = ExerciseDB(
            id=seed["id"],
            position=position,
            name="",
            movement_type=data.movement_type,
            photo_url=seed.get("photo_url"),
            video_url=seed.get("video_url"),
        )
        apply_exercise_write(row, data)

        session.add(row)

    session.commit()
