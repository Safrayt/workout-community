import enum
from datetime import date as date_type
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Field, SQLModel


# --- Каталог комплексов --------------------------------------------------
#
# Комплекс — это стандартная тренировочная схема (см.
# UX-документ «Система стандартных комплексов»). Как и ACHIEVEMENTS в
# models_achievement.py, каталог комплексов — это фиксированный
# статичный список, а не таблица в базе: пользователи не создают
# комплексы сами (см. п.35 документа), поэтому CRUD для них не нужен.
# Таблицей в базе является только ComplexCompletion — конкретное
# выполнение конкретным пользователем.


class ComplexType(str, enum.Enum):
    ladder = "ladder"
    circuit = "circuit"
    sets = "sets"  # «Подходы»


class MovementType(str, enum.Enum):
    """
    Категория движения — используется как тег комплекса для фильтра
    каталога. Конкретное упражнение внутри категории (например,
    «Подтягивания» для pull) в комплекс уже не выбирается —
    оно зашито в сложность (см. DifficultyTier ниже).
    """

    pull = "pull"  # Тяга
    press = "press"  # Жим
    legs = "legs"  # Ноги


class DifficultyTier(str, enum.Enum):
    """
    Уровень сложности комплекса. Конкретное упражнение, из которого
    состоит комплекс, «зашито» в его сложность — то есть один и тот
    же комплекс (например, «/-лесенка до 10») существует в каталоге
    как несколько отдельных записей — по одной на каждый уровень
    сложности, а не как один комплекс с выбором варианта нагрузки
    внутри. Выбор упражнения пользователем на странице комплекса
    больше не требуется.
    """

    iron = "iron"  # Чугун
    steel = "steel"  # Сталь
    titanium = "titanium"  # Титан


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
    Один комплекс из каталога. Не таблица — см. комментарий выше.
    """

    id: str
    name: str
    type: ComplexType
    description: str = ""

    # Визуальная схема (п.4, 12.2). scheme_steps используется, когда
    # схему можно показать как числовую последовательность
    # (например, лесенку 1→2→...→10); для схем, которые так не
    # рисуются (суперсет, круговая), заполняется только scheme_display.
    scheme_display: str
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None

    # Теги движений — только для каталога и фильтра. Конкретное
    # упражнение в схему уже не выбирается (см. DifficultyTier).
    movements: List[MovementType]

    # Конкретное упражнение, зашитое в эту сложность (например,
    # «Австралийские подтягивания» для Чугуна той же лесенки, где
    # Сталь — «Подтягивания», а Титан — «Выходы силой»). В отличие
    # от movements (категория для фильтра), это — текст для
    # отображения на странице комплекса.
    exercise: str

    # Уровень сложности этого конкретного комплекса. Один и тот же
    # «сюжет» комплекса на разных уровнях сложности — это разные
    # записи каталога (разные id), а не варианты одной записи.
    difficulty: DifficultyTier

    # Какие показатели нужны для расчёта результата этого конкретного
    # комплекса — определяет набор полей в форме отметки выполнения.
    result_metrics: List[MetricType]

    # Условия 2 и 3 звёзд. Пустой список означает, что у комплекса
    # есть только 1 звезда — «выполнить».
    star_conditions: List[StarCondition] = []

    instructions: Optional[str] = None
    restrictions: Optional[str] = None


# Является ли основной показатель комплекса «чем меньше, тем лучше»
# (время) или «чем больше, тем лучше» (объём) — нужно для определения
# лучшего результата (п.21 документа).
TIME_LIKE_METRICS = {MetricType.time, MetricType.duration}


def is_time_based(complex_def: Complex) -> bool:
    return any(m in TIME_LIKE_METRICS for m in complex_def.result_metrics)


# Единственный источник правды — фронтенд не хранит свою копию
# каталога, а получает его целиком через GET /complexes (см.
# api/complexes.ts на фронтенде).
#
# Каталог временно пуст — тестовые комплексы удалены, готов к
# наполнению.
COMPLEXES: List[Complex] = []


def get_complex_or_none(complex_id: str) -> Optional[Complex]:
    for complex_def in COMPLEXES:
        if complex_def.id == complex_id:
            return complex_def

    return None


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
