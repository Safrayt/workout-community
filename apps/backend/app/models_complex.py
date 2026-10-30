import enum
from datetime import date as date_type
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import field_validator
from sqlalchemy import JSON, Column
from sqlmodel import Field, Session, SQLModel, select

from app.utc import UtcDatetime


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
    interval = "interval"  # Интервальный (каждое упражнение — на своё время)


class MovementType(str, enum.Enum):
    """
    Тип движения комплекса — тот же список, что у упражнений (см.
    models_exercise.MovementType и constants/movementTypes.ts на
    фронтенде). Администратор его НЕ выбирает: тип комплекса — это
    типы движения упражнений его схемы, они выводятся автоматически
    (см. movements_from_exercises ниже и routers/complexes.py).
    Используется как тег комплекса для фильтра каталога.
    """

    pull = "pull"  # Тяговые
    push = "push"  # Жимовые
    abduction = "abduction"  # Отведения
    crunch = "crunch"  # Скручивания
    kneeDominant = "kneeDominant"  # Колено-доминантные
    hipDominant = "hipDominant"  # Тазо-доминантные
    ankleExtension = "ankleExtension"  # Разгибание стопы


# Значения старой классификации комплексов («Тяга / Жим / Ноги»),
# которые ещё могут лежать в базе у комплексов без упражнений из базы
# упражнений. «Тяга» и «Жим» переходят в одноимённые новые типы; «Ноги»
# однозначно не переводится (колено-доминантные? тазо-доминантные?
# разгибание стопы?), поэтому такое значение отбрасывается — тип
# появится, как только к комплексу привяжут упражнения.
_LEGACY_MOVEMENT_VALUES = {
    "pull": "pull",
    "press": "push",
}


def normalize_stored_movements(values) -> List[str]:
    """
    Приводит сохранённый список типов движения к актуальному: старые
    значения («press») заменяет, неизвестные («legs») отбрасывает,
    повторы убирает. Нужна, чтобы строка со старой классификацией не
    роняла чтение каталога.
    """
    valid = {item.value for item in MovementType}
    result: List[str] = []

    for value in values or []:
        value = _LEGACY_MOVEMENT_VALUES.get(value, value)

        if value in valid and value not in result:
            result.append(value)

    return result


def movements_from_exercises(movement_types) -> List[str]:
    """
    Типы движения комплекса по типам его упражнений — в порядке первого
    появления в схеме, без повторов. Неизвестные значения (в базе
    упражнений тип — обычная строка) пропускаются.
    """
    return normalize_stored_movements(movement_types)


class MetricType(str, enum.Enum):
    """
    Показатель, которым измеряется результат выполнения.
    Определяет, какие поля показывать в форме отметки выполнения
    (см. п.16 документа — «поля, которые не нужны для расчёта
    результата, не отображаются»).
    """

    time = "time"
    reps = "reps"
    sets = "sets"
    rounds = "rounds"
    duration = "duration"
    count = "count"


# --- Структурированная схема комплекса ----------------------------------
#
# Схема — список БЛОКОВ. Блок — повторяющаяся группа упражнений:
#   * интервалы («3 упражнения по минуте») — один блок, 1 раз;
#   * круговая схема («4 упражнения, 11 кругов») — один блок, 11 кругов;
#   * подходы — блок на упражнение, N подходов;
#   * несколько суперсетов — по блоку на каждый суперсет.
# В блоке — СТРОКИ: упражнение из базы упражнений и нагрузка. Одно и то
# же упражнение можно ставить в схему сколько угодно раз (в том числе
# подряд) — каждая строка независима.


class SchemeItem(SQLModel):
    exercise_id: str

    # Нагрузка. Сочетания (остальные недопустимы — см. validate_scheme):
    #   reps                       — «10 повторений»;
    #   max_effort                 — «максимум повторений»;
    #   max_effort + duration      — «максимум повторений за 60 секунд»;
    #   duration                   — «30 секунд» (удержание, работа по времени);
    #   reps + duration            — «5 повторений за 40 секунд» (минутки).
    reps: Optional[int] = None
    max_effort: bool = False
    duration_seconds: Optional[int] = None

    # Прогрессия по кругам/подходам блока: на сколько меняются повторения
    # на каждом следующем круге (например, −1) и до какой границы: нижней
    # при убывании, верхней при росте («не ниже 5»).
    reps_step: int = 0
    reps_limit: Optional[int] = None

    note: Optional[str] = None


class SchemeBlock(SQLModel):
    title: Optional[str] = None

    # Сколько раз повторить блок. None — «столько, сколько успеете за
    # time_limit_seconds» (AMRAP): тогда лимит времени обязателен.
    rounds: Optional[int] = 1
    rounds_kind: Literal["rounds", "sets"] = "rounds"  # кругов / подходов

    rest_between_items_seconds: Optional[int] = None
    rest_between_rounds_seconds: Optional[int] = None
    time_limit_seconds: Optional[int] = None

    items: List[SchemeItem] = []


MAX_SCHEME_BLOCKS = 20
MAX_SCHEME_ITEMS_PER_BLOCK = 30
MAX_SCHEME_ROUNDS = 100
MAX_SCHEME_REPS = 1000
MAX_SCHEME_SECONDS = 24 * 60 * 60


def scheme_row_exercise_ids(scheme: List[SchemeBlock]) -> List[str]:
    """Упражнения всех строк схемы по порядку — с повторами."""
    return [item.exercise_id for block in scheme for item in block.items]


def scheme_exercise_ids(scheme: List[SchemeBlock]) -> List[str]:
    """Разные упражнения схемы в порядке первого появления (без повторов)."""
    return list(dict.fromkeys(scheme_row_exercise_ids(scheme)))


def validate_scheme(scheme: List[SchemeBlock]) -> None:
    """
    Проверяет схему на внутреннюю согласованность (существование
    упражнений в базе проверяет роутер). При нарушении бросает
    ValueError с сообщением для администратора — роутер превращает его
    в ответ 422.
    """
    if len(scheme) > MAX_SCHEME_BLOCKS:
        raise ValueError(f"В схеме не может быть больше {MAX_SCHEME_BLOCKS} блоков.")

    for block_number, block in enumerate(scheme, start=1):
        where = f"Блок {block_number}"

        if not block.items:
            raise ValueError(f"{where}: добавьте хотя бы одно упражнение.")

        if len(block.items) > MAX_SCHEME_ITEMS_PER_BLOCK:
            raise ValueError(
                f"{where}: не больше {MAX_SCHEME_ITEMS_PER_BLOCK} упражнений в блоке."
            )

        if block.rounds is None:
            if not block.time_limit_seconds:
                raise ValueError(
                    f"{where}: для «максимум за время» укажите лимит времени."
                )
        elif not 1 <= block.rounds <= MAX_SCHEME_ROUNDS:
            raise ValueError(
                f"{where}: число кругов/подходов — от 1 до {MAX_SCHEME_ROUNDS}."
            )

        for label, seconds in (
            ("отдых между упражнениями", block.rest_between_items_seconds),
            ("отдых между кругами", block.rest_between_rounds_seconds),
            ("лимит времени", block.time_limit_seconds),
        ):
            if seconds is not None and not 0 <= seconds <= MAX_SCHEME_SECONDS:
                raise ValueError(f"{where}: {label} вне допустимых пределов.")

        for item_number, item in enumerate(block.items, start=1):
            row = f"{where}, упражнение {item_number}"

            if item.reps is not None and item.max_effort:
                raise ValueError(
                    f"{row}: нельзя одновременно задать число повторений и «максимум»."
                )

            if item.reps is not None and not 1 <= item.reps <= MAX_SCHEME_REPS:
                raise ValueError(f"{row}: повторений — от 1 до {MAX_SCHEME_REPS}.")

            if item.duration_seconds is not None and not (
                1 <= item.duration_seconds <= MAX_SCHEME_SECONDS
            ):
                raise ValueError(f"{row}: время вне допустимых пределов.")

            if item.reps_step != 0:
                if item.reps is None:
                    raise ValueError(
                        f"{row}: изменение повторений по кругам возможно только "
                        "при заданном числе повторений."
                    )

                if abs(item.reps_step) > 100:
                    raise ValueError(f"{row}: слишком большой шаг прогрессии.")

            if item.reps_limit is not None and not 1 <= item.reps_limit <= MAX_SCHEME_REPS:
                raise ValueError(f"{row}: граница прогрессии — от 1 до {MAX_SCHEME_REPS}.")

            # Убывающая прогрессия не должна уходить в ноль и ниже.
            if item.reps is not None and item.reps_step < 0 and block.rounds is not None:
                last = item.reps + item.reps_step * (block.rounds - 1)

                if item.reps_limit is not None:
                    last = max(last, item.reps_limit)

                if last < 1:
                    raise ValueError(
                        f"{row}: повторения опускаются ниже 1 — укажите границу "
                        "(«не ниже …») или уменьшите шаг."
                    )


class Complex(SQLModel):
    """
    Один комплекс из каталога — форма, в которой каталог отдаётся по
    API и в которой с ним работает бизнес-логика этого файла (см.
    is_time_based ниже и routers/complexes.py).
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
    scheme_display: str = ""
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None

    # Структурированная схема (см. SchemeBlock выше). Когда она есть,
    # именно она показывается на странице комплекса, а scheme_display /
    # scheme_steps / total_reps выше — устаревший текстовый вариант
    # (остаётся только у комплексов, заведённых до структурированной
    # схемы). Упражнения схемы — единственный источник exercise_ids.
    scheme: List[SchemeBlock] = []

    # Пояснение к схеме целиком («отдыхать можно, но время не
    # останавливается…») — показывается внизу схемы.
    scheme_note: Optional[str] = None

    # Типы движения комплекса — для карточки и фильтра каталога. Это
    # типы движения упражнений схемы (в порядке первого появления),
    # администратор их не вводит: при записи и при выдаче API сервер
    # выводит их сам (см. routers/complexes.py). Конкретное упражнение
    # задаётся отдельным текстовым полем exercise ниже.
    movements: List[MovementType] = []

    # Конкретное упражнение (или несколько — через exercise можно
    # описать целую схему из нескольких движений, см. «Схему
    # Ганнибала» в SEED_COMPLEXES). Текст для отображения на странице
    # комплекса, не влияет на фильтрацию (для неё есть movements).
    exercise: str

    # Упражнения комплекса из базы упражнений (Exercise.id) в порядке
    # схемы — на них строятся ссылки со страницы комплекса на
    # страницы упражнений и общая мышечная группа комплекса.
    # У комплексов, заведённых до этой связи, список пуст — тогда
    # показывается только текстовое exercise. Если список непустой,
    # API отдаёт exercise собранным из актуальных названий упражнений
    # (см. compose_exercise_text), так что переименование упражнения
    # не оставляет в комплексе старое название.
    exercise_ids: List[str] = []

    # Какие показатели нужны для расчёта результата этого конкретного
    # комплекса — определяет набор полей в форме отметки выполнения.
    result_metrics: List[MetricType]

    instructions: Optional[str] = None
    restrictions: Optional[str] = None

    @field_validator("exercise_ids", "scheme", mode="before")
    @classmethod
    def _missing_list_is_empty_list(cls, value):
        # У строк, созданных до появления колонок, там NULL.
        return [] if value is None else value

    @field_validator("movements", mode="before")
    @classmethod
    def _movements_in_current_classification(cls, value):
        # У старых строк там «press»/«legs» (см. normalize_stored_movements).
        return normalize_stored_movements(value)


class ComplexDB(SQLModel, table=True):
    """
    Таблица каталога комплексов. Списки/enum'ы (types, movements,
    result_metrics, scheme_steps) хранятся как
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

    scheme_display: str = ""
    scheme_steps: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    total_reps: Optional[int] = None

    # См. Complex.scheme / Complex.scheme_note. Колонки добавлены позже
    # таблицы — см. _run_migrations в database.py.
    scheme: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    scheme_note: Optional[str] = None

    # Типы движения комплекса: производное от упражнений (см.
    # movements_from_exercises). Хранится для комплексов без привязки к
    # базе упражнений и как запасной вариант; у связанных комплексов API
    # пересчитывает их при каждой выдаче по актуальным типам упражнений.
    movements: List[str] = Field(default_factory=list, sa_column=Column(JSON))

    exercise: str

    # См. Complex.exercise_ids. Колонка добавлена позже таблицы — см.
    # _run_migrations в database.py.
    exercise_ids: List[str] = Field(default_factory=list, sa_column=Column(JSON))

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
    # Устаревший текстовый вариант схемы (см. Complex.scheme): новые
    # комплексы описываются структурированной схемой, текст не нужен.
    scheme_display: str = ""
    scheme_steps: Optional[List[int]] = None
    total_reps: Optional[int] = None
    scheme: List[SchemeBlock] = []
    scheme_note: Optional[str] = None
    # Тип движения комплекса (movements) клиент не присылает: сервер
    # выводит его из упражнений схемы. Если клиент всё же пришлёт это
    # поле, оно игнорируется.
    # Упражнения выбираются из базы упражнений (exercise_ids). Текст
    # exercise для них собирается на сервере из названий, поэтому его
    # можно не передавать; он нужен только для комплекса без привязки
    # к базе (старый способ) — хотя бы одно из двух должно быть.
    exercise: str = ""
    exercise_ids: List[str] = []
    result_metrics: List[MetricType]
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
    scheme: Optional[List[SchemeBlock]] = None
    scheme_note: Optional[str] = None
    exercise: Optional[str] = None
    exercise_ids: Optional[List[str]] = None
    result_metrics: Optional[List[MetricType]] = None
    instructions: Optional[str] = None
    restrictions: Optional[str] = None


# Значение-заглушка для устаревшей NOT NULL колонки ComplexDB.difficulty
# (см. комментарий там) — подставляется при создании любой новой
# записи, никогда не читается обратно и не участвует ни в какой логике.
def compose_exercise_text(names: List[str]) -> str:
    """
    Текст "Упражнение(я)" для карточки и страницы комплекса из названий
    упражнений в порядке схемы: одно — просто название, несколько —
    нумерованный список через "  •  " (как у «Схемы Ганнибала»).
    """
    if len(names) == 1:
        return names[0]

    return "  •  ".join(f"{number}. {name}" for number, name in enumerate(names, 1))


_LEGACY_DIFFICULTY_VALUE = "removed"


def complex_from_db(row: ComplexDB) -> Complex:
    """
    Строка БД хранит списки как "сырые" строки/словари (см. ComplexDB).
    Complex.model_validate сама приводит их к настоящим enum'ам
    благодаря объявленным типам полей — отдельно перечислять и
    конвертировать каждое поле вручную не нужно. Поле
    difficulty в строке БД есть, а в Complex — уже нет; лишние ключи
    при валидации молча игнорируются, отдельно вырезать не нужно.
    """
    return Complex.model_validate(row.model_dump())


def complex_db_from_create(data: ComplexCreate) -> ComplexDB:
    """
    mode="json" превращает enum'ы и вложенные модели в обычные
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
        # Структурированная схема: 4 упражнения × 11 кругов, повторения
        # каждый круг уменьшаются на 1; подтягивания (оба хвата) — не ниже 5.
        scheme=[
            SchemeBlock(
                rounds=11,
                rounds_kind="rounds",
                items=[
                    SchemeItem(exercise_id="pullups-wide", reps=10, reps_step=-1, reps_limit=5),
                    SchemeItem(exercise_id="pushups", reps=30, reps_step=-1),
                    SchemeItem(exercise_id="pullups-reverse", reps=10, reps_step=-1, reps_limit=5),
                    SchemeItem(exercise_id="dips", reps=20, reps_step=-1),
                ],
            )
        ],
        # Сумма всех повторений по всем 4 упражнениям за все 11 кругов:
        # подтягивания (оба хвата) 10→5 с шагом −1, затем держатся на 5:
        # (10+9+8+7+6+5)+(5×5) = 70 на каждый хват × 2 хвата = 140;
        # отжимания от пола 30→20 по кругам: (30+20)×11/2 = 275;
        # отжимания на брусьях 20→10 по кругам: (20+10)×11/2 = 165.
        # Итого 140 + 275 + 165 = 580.
        total_reps=580,
        movements=[MovementType.pull, MovementType.push],
        exercise=(
            "1. Подтягивания верхним хватом  •  2. Отжимания от пола  •  "
            "3. Подтягивания нижним хватом  •  4. Отжимания на брусьях"
        ),
        # Ближайшие упражнения из базы упражнений (стартовый набор в
        # exercise_seed.json): "верхний хват" — подтягивания широким
        # хватом (прямой хват), "нижний хват" — подтягивания обратным
        # хватом. Порядок — как в схеме.
        exercise_ids=["pullups-wide", "pushups", "pullups-reverse", "dips"],
        result_metrics=[MetricType.time],
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

    # УСТАРЕВШЕЕ ПОЛЕ, НЕ ИСПОЛЬЗУЕТСЯ. Раньше здесь хранилось число
    # звёзд за выполнение — звёзды из комплексов убраны, оценка
    # выполнения теперь идёт через очки. Колонка оставлена физически в
    # БД (на уже существующей базе она NOT NULL без значения по
    # умолчанию, а инструмента миграций для PostgreSQL в проекте нет —
    # та же причина, что у ComplexDB.difficulty). Нигде не читается и
    # не пишется; новые записи получают 0.
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
    diary_entry_id: Optional[int] = None
    created_at: UtcDatetime
    updated_at: UtcDatetime


# --- Рейтинг комплекса ------------------------------------------------------
#
# «Очки» пользователя в комплексе — значение основного показателя его
# ЛУЧШЕГО выполнения (для объёмных комплексов — например, сумма
# повторений, чем больше, тем лучше; для временных — время, чем меньше,
# тем лучше). Видны всем (в том числе
# гостям) только ник и это значение — сама история выполнений остаётся
# личной (см. list_completions в routers/complexes.py).


class ComplexLeaderboardRow(SQLModel):
    rank: int
    user_id: int
    nickname: str

    # Секунды для временных комплексов, иначе количество (повторений,
    # кругов и т.д.).
    value: int

    # Строка текущего пользователя (у гостя всегда False).
    is_me: bool = False


class ComplexLeaderboard(SQLModel):
    # Сколько всего участников в рейтинге (а не строк в ответе).
    total: int
    rows: List[ComplexLeaderboardRow]


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
    created_at: UtcDatetime
