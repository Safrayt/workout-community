import enum
from datetime import date as date_type
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, Session, SQLModel, select


# --- Каталог комплексов --------------------------------------------------
#
# Комплекс — это стандартная тренировочная схема (см.
# UX-документ «Система стандартных комплексов»). Изначально каталог
# был статичным списком в коде (как ACHIEVEMENTS в
# models_achievement.py) — пользователи не создают комплексы сами, но
# администратору нужно уметь пополнять и править каталог без правки
# кода и передеплоя, поэтому теперь это настоящая таблица (ComplexDB
# ниже), а не список.


class ComplexType(str, enum.Enum):
    """
    Тег формата тренировки. Один комплекс может сочетать сразу
    несколько (например, «Схема Ганнибала» — это одновременно и
    круговая, и лесенка), поэтому в Complex это список, а не
    единственное значение — см. Complex.types ниже.
    """

    ladder = "ladder"  # Лесенка
    circuit = "circuit"  # Круги
    sets = "sets"  # Подходы
    superset = "superset"  # Суперсеты
    dropset = "dropset"  # Дропсеты
    emom = "emom"  # Минутки (EMOM)
    amrap = "amrap"  # На время (AMRAP)


class MovementType(str, enum.Enum):
    """
    Категория движения — используется как тег комплекса для фильтра
    каталога. Конкретное упражнение внутри категории (например,
    «Подтягивания» для pull) задаётся отдельным текстовым полем
    exercise у самого комплекса, а не выбирается пользователем.
    """

    pull = "pull"  # Тяга
    press = "press"  # Жим
    legs = "legs"  # Ноги


class MetricType(str, enum.Enum):
    """
    Показатель, которым измеряется результат выполнения.
    Определяет, какие поля показывать в форме отметки выполнения
    (см. п.16 документа — «поля, которые не нужны для расчёта
    результата, не отображаются») и какое значение сравнивать с
    условиями звёзд.
    """

    time = "time"
    reps = "reps"
    sets = "sets"
    rounds = "rounds"
    duration = "duration"
    count = "count"


class ComparisonOperator(str, enum.Enum):
    """Оператор сравнения результата с условием звезды."""

    lte = "lte"  # результат ≤ значения (для времени)
    gte = "gte"  # результат ≥ значения (для объёма/повторов)
    eq = "eq"


class StarCondition(SQLModel):
    """
    Условие получения 2 или 3 звёзд (см. п.8–9 документа).
    1 звезда всегда означает «выполнить комплекс полностью» и не
    хранится здесь отдельным условием — она присваивается, как
    только пользователь фиксирует любое выполнение.

    metric/operator/value/unit достаточно, чтобы:
    - сравнить введённый пользователем результат;
    - естественным образом отобразить условие в интерфейсе
      (это делает format_star_condition ниже).
    """

    stars: int
    metric: MetricType
    operator: ComparisonOperator
    value: float
    unit: str


def format_star_condition(condition: StarCondition) -> str:
    """
    Превращает структурированное условие в текст на естественном
    языке для интерфейса — как того требует п.8 документа
    («В интерфейсе они отображаются естественным языком»).
    """

    operator_symbol = {
        ComparisonOperator.lte: "≤",
        ComparisonOperator.gte: "≥",
        ComparisonOperator.eq: "=",
    }[condition.operator]

    if condition.metric == MetricType.time:
        total_seconds = int(condition.value)
        minutes, seconds = divmod(total_seconds, 60)
        return f"Время {operator_symbol} {minutes:02d}:{seconds:02d}"

    metric_labels = {
        MetricType.reps: "Повторений",
        MetricType.sets: "Подходов",
        MetricType.rounds: "Кругов",
        MetricType.duration: "Продолжительность",
        MetricType.count: condition.unit.capitalize() if condition.unit else "Значение",
    }
    label = metric_labels[condition.metric]

    value_display = (
        int(condition.value)
        if condition.value == int(condition.value)
        else condition.value
    )
    unit_suffix = f" {condition.unit}" if condition.unit else ""

    return f"{label} {operator_symbol} {value_display}{unit_suffix}"


class Complex(SQLModel):
    """
    Один комплекс из каталога — форма, в которой каталог отдаётся по
    API и в которой с ним работает бизнес-логика этого файла (расчёт
    звёзд и т.п., см. is_time_based ниже и routers/complexes.py).
    Хранится в БД в таблице complex в более "плоском" виде (см.
    ComplexDB) — friendlier для JSON-колонок; complex_from_db()
    ниже конвертирует строку БД в этот класс на выходе.
    """

    id: str
    name: str

    # Список, а не одно значение: комплекс может одновременно быть,
    # например, и "круги", и "лесенка" — см. комментарий у ComplexType.
    types: List[ComplexType]

    description: str = ""

    # Визуальная схема (п.4, 12.2). scheme_steps используется, когда
    # схему можно показать как числовую последовательность
    # (например, лесенку 1→2→...→10); для схем, которые так не
    # рисуются (суперсет, круговая), заполняется только scheme_display.
    scheme_display: str
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None

    # Теги движений — только для каталога и фильтра. Конкретное
    # упражнение задаётся отдельным текстовым полем exercise ниже.
    movements: List[MovementType]

    # Конкретное упражнение (или несколько — через exercise можно
    # описать целую схему из нескольких движений, см. «Схему
    # Ганнибала» в SEED_COMPLEXES). Текст для отображения на странице
    # комплекса, не влияет на фильтрацию (для неё есть movements).
    exercise: str

    # Какие показатели нужны для расчёта результата этого конкретного
    # комплекса — определяет набор полей в форме отметки выполнения.
    result_metrics: List[MetricType]

    # Условия 2 и 3 звёзд. Пустой список означает, что у комплекса
    # есть только 1 звезда — «выполнить».
    star_conditions: List[StarCondition] = []

    instructions: Optional[str] = None
    restrictions: Optional[str] = None


class ComplexDB(SQLModel, table=True):
    """
    Таблица каталога комплексов. Списки/enum'ы (types, movements,
    result_metrics, star_conditions, scheme_steps) хранятся как
    JSON-колонки: ни SQLAlchemy, ни Postgres не умеют нативно
    колонку вида "список enum-значений", а заводить отдельные
    таблицы-справочники ради 4 коротких списков, которые никогда не
    запрашиваются отдельно от своего комплекса, было бы избыточным
    усложнением. id — не автоинкремент, а человекочитаемый слаг
    (например, "hannibal-scheme-steel"), как и раньше в статичном
    каталоге — на нём завязаны URL и ссылки из ComplexCompletion/
    ComplexComment.
    """

    __tablename__ = "complex"

    id: str = Field(primary_key=True)
    name: str

    types: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    description: str = ""

    scheme_display: str
    scheme_steps: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    total_reps: Optional[int] = None

    movements: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    exercise: str

    # УСТАРЕВШЕЕ ПОЛЕ, НЕ ИСПОЛЬЗУЕТСЯ. Раньше здесь хранился уровень
    # сложности комплекса — убрали по решению, что это слишком
    # субъективное понятие (см. историю изменений). Колонка оставлена
    # физически в БД, а не удалена через ALTER TABLE, потому что:
    # 1) на уже существующей базе она NOT NULL без значения по
    #    умолчанию, и удалять/менять такую колонку — риск сломать
    #    прод без крайней необходимости; 2) в этом проекте нет
    #    инструмента миграций для PostgreSQL (см. database._run_migrations
    #    — она сознательно работает только с SQLite). Ни один
    #    Create/Update/Read-класс ниже её больше не знает —
    #    _LEGACY_DIFFICULTY_VALUE подставляется автоматически при
    #    создании новой записи, менять его не нужно.
    difficulty: str

    result_metrics: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    star_conditions: List[dict] = Field(default_factory=list, sa_column=Column(JSON))

    instructions: Optional[str] = None
    restrictions: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ComplexCreate(SQLModel):
    """
    Тело запроса на добавление комплекса — id администратор задаёт
    сам (человекочитаемый слаг для URL, как и у существующих записей),
    остальные поля типизированы через настоящие enum'ы, чтобы
    некорректное значение (опечатка в типе или сложности) отклонялось
    на валидации, а не долетало до базы.
    """

    id: str
    name: str
    types: List[ComplexType]
    description: str = ""
    scheme_display: str
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None
    movements: List[MovementType]
    exercise: str
    result_metrics: List[MetricType]
    star_conditions: List[StarCondition] = []
    instructions: Optional[str] = None
    restrictions: Optional[str] = None


class ComplexUpdate(SQLModel):
    """
    Тело запроса на редактирование — все поля необязательны,
    обновляется только то, что передано (см. apply_complex_update).
    id сюда специально не входит — менять "адрес" уже существующего
    комплекса означало бы рвать ссылки на него из выполнений,
    комментариев и закладок пользователей.
    """

    name: Optional[str] = None
    types: Optional[List[ComplexType]] = None
    description: Optional[str] = None
    scheme_display: Optional[str] = None
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None
    movements: Optional[List[MovementType]] = None
    exercise: Optional[str] = None
    result_metrics: Optional[List[MetricType]] = None
    star_conditions: Optional[List[StarCondition]] = None
    instructions: Optional[str] = None
    restrictions: Optional[str] = None


# Значение-заглушка для устаревшей NOT NULL колонки ComplexDB.difficulty
# (см. комментарий там) — подставляется при создании любой новой
# записи, никогда не читается обратно и не участвует ни в какой логике.
_LEGACY_DIFFICULTY_VALUE = "removed"


def complex_from_db(row: ComplexDB) -> Complex:
    """
    Строка БД хранит списки как "сырые" строки/словари (см. ComplexDB).
    Complex.model_validate сама приводит их к настоящим enum'ам и
    StarCondition благодаря объявленным типам полей — отдельно
    перечислять и конвертировать каждое поле вручную не нужно. Поле
    difficulty в строке БД есть, а в Complex — уже нет; лишние ключи
    при валидации молча игнорируются, отдельно вырезать не нужно.
    """
    return Complex.model_validate(row.model_dump())


def complex_db_from_create(data: ComplexCreate) -> ComplexDB:
    """
    mode="json" превращает enum'ы и вложенные StarCondition в обычные
    строки/словари — то есть ровно в то, что ждут JSON-колонки
    ComplexDB (обратная операция по отношению к complex_from_db).
    difficulty добавляется отдельно — в ComplexCreate его больше нет
    (см. комментарий у ComplexDB.difficulty).
    """
    return ComplexDB(
        **data.model_dump(mode="json"),
        difficulty=_LEGACY_DIFFICULTY_VALUE,
    )


def apply_complex_update(row: ComplexDB, data: ComplexUpdate) -> None:
    """Записывает в row только те поля, что были явно переданы."""
    update_data = data.model_dump(exclude_unset=True, mode="json")

    for field_name, value in update_data.items():
        setattr(row, field_name, value)

    row.updated_at = datetime.now(timezone.utc)


# Является ли основной показатель комплекса «чем меньше, тем лучше»
# (время) или «чем больше, тем лучше» (объём) — нужно для определения
# лучшего результата (п.21 документа).
TIME_LIKE_METRICS = {MetricType.time, MetricType.duration}


def is_time_based(complex_def: Complex) -> bool:
    return any(m in TIME_LIKE_METRICS for m in complex_def.result_metrics)


# Стартовые данные каталога — единственная задача этого списка теперь
# на порядок скромнее, чем раньше у COMPLEXES: заполнить таблицу при
# самом первом запуске (seed_complexes_if_empty ниже), чтобы «Схема
# Ганнибала» не потерялась при переходе со статичного каталога на
# таблицу. Дальше администратор пополняет каталог уже через форму на
# сайте — редактировать этот список не нужно и незачем.
SEED_COMPLEXES: List[Complex] = [
    Complex(
        id="hannibal-scheme-steel",
        name="Схема Ганнибала",
        types=[ComplexType.circuit, ComplexType.ladder],
        description=(
            "Круговая схема. Начинается с 10+30+10+20 и заканчивается на "
            "5+20+5+10. Каждый круг уменьшает повторения на один — кроме "
            "подтягиваний: они не опускаются ниже 5, а дальше на месте "
            "продолжают снижаться только отжимания и брусья. Всего 11 "
            "кругов."
        ),
        scheme_display="10+30+10+20 → 5+20+5+10 (−1 повторение за круг)",
        scheme_steps=None,
        # Сумма всех повторений по всем 4 упражнениям за все 11 кругов:
        # подтягивания (оба хвата) 10→5 с шагом −1, затем держатся на 5:
        # (10+9+8+7+6+5)+(5×5) = 70 на каждый хват × 2 хвата = 140;
        # отжимания от пола 30→20 по кругам: (30+20)×11/2 = 275;
        # отжимания на брусьях 20→10 по кругам: (20+10)×11/2 = 165.
        # Итого 140 + 275 + 165 = 580.
        total_reps=580,
        movements=[MovementType.pull, MovementType.press],
        exercise=(
            "1. Подтягивания верхним хватом  •  2. Отжимания от пола  •  "
            "3. Подтягивания нижним хватом  •  4. Отжимания на брусьях"
        ),
        result_metrics=[MetricType.time],
        star_conditions=[
            StarCondition(
                stars=2,
                metric=MetricType.time,
                operator=ComparisonOperator.lte,
                value=45 * 60,
                unit="",
            ),
            StarCondition(
                stars=3,
                metric=MetricType.time,
                operator=ComparisonOperator.lte,
                value=30 * 60,
                unit="",
            ),
        ],
        instructions=(
            "Порядок в круге не меняется: верхний хват → отжимания → "
            "нижний хват → брусья, затем сразу следующий круг без "
            "полноценного отдыха между кругами."
        ),
        restrictions=None,
    ),
]


def seed_complexes_if_empty(session: Session) -> None:
    """
    Заполняет таблицу complex стартовыми данными, но только если она
    ещё вообще пуста — не трогает базу, если администратор уже успел
    что-то добавить или отредактировать (в том числе если он удалил
    сам сид). Вызывается один раз при старте приложения, уже после
    create_all() (см. database.py) — таблица к этому моменту точно
    существует.
    """
    existing = session.exec(select(ComplexDB)).first()

    if existing is not None:
        return

    for seed in SEED_COMPLEXES:
        session.add(
            ComplexDB(
                **seed.model_dump(mode="json"),
                difficulty=_LEGACY_DIFFICULTY_VALUE,
            )
        )

    session.commit()


# --- Выполнение комплекса --------------------------------------------------


class ComplexCompletionBase(SQLModel):
    complex_id: str

    # Только нужные для конкретного комплекса поля результата
    # заполняются — остальные остаются None (п.16 документа).
    result_time_seconds: Optional[int] = None
    result_reps: Optional[int] = None
    result_sets: Optional[int] = None
    result_rounds: Optional[int] = None
    result_duration_seconds: Optional[int] = None
    result_count: Optional[int] = None

    completed_date: date_type = Field(
        default_factory=lambda: datetime.now(timezone.utc).date()
    )


class ComplexCompletion(ComplexCompletionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")

    # Подтверждающая запись дневника — намеренно необязательная связь
    # на уровне схемы (см. комментарий у diary_entry_id ниже), хотя
    # POST-эндпоинт создания требует её явно (см. routers/complexes.py).
    # При удалении записи дневника сюда пишется None, а не удаляется
    # само выполнение (см. п.27 документа и
    # routers/diary.py:delete_workout_entry).
    diary_entry_id: Optional[int] = Field(
        default=None, foreign_key="workoutentry.id"
    )

    # Считается сервером в момент создания/редактирования — никогда
    # не приходит от клиента (см. п.9: «пользователь не выбирает
    # количество звёзд самостоятельно»).
    stars: int = 0

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ComplexCompletionCreate(ComplexCompletionBase):
    diary_entry_id: Optional[int] = None


class ComplexCompletionUpdate(SQLModel):
    """Все поля необязательны — обновляем только то, что передано."""

    result_time_seconds: Optional[int] = None
    result_reps: Optional[int] = None
    result_sets: Optional[int] = None
    result_rounds: Optional[int] = None
    result_duration_seconds: Optional[int] = None
    result_count: Optional[int] = None
    diary_entry_id: Optional[int] = None
    completed_date: Optional[date_type] = None

    # Явный флаг нужен, чтобы отличить «не передано» от «отвязать
    # запись дневника» (JSON null не отличить от отсутствующего поля
    # при exclude_unset, поэтому используем model_fields_set на
    # уровне роутера вместе с этим флагом).
    clear_diary_entry: bool = False


class ComplexCompletionRead(ComplexCompletionBase):
    id: int
    user_id: int
    stars: int
    diary_entry_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# --- Комментарии к комплексу ------------------------------------------------
#
# В отличие от ComplexCompletion, комментарий не привязан к
# конкретному пользователю через ограничение "один на комплекс" —
# как и с отзывами площадок (PlaygroundReview), один и тот же
# человек может оставить сколько угодно комментариев.


class ComplexCommentBase(SQLModel):
    text: str


class ComplexComment(ComplexCommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Ссылается на статичный каталог COMPLEXES (см. get_complex_or_none
    # выше), а не на таблицу в БД — обычный foreign_key сюда не
    # поставить, существование id проверяется в роутере при создании.
    complex_id: str

    user_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ComplexCommentCreate(ComplexCommentBase):
    pass


class ComplexCommentRead(ComplexCommentBase):
    id: int
    complex_id: str
    user_id: int
    created_at: datetime
