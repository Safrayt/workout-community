import enum
import re
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import field_validator, model_serializer, model_validator
from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from app.utc import UtcDatetime

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
# версией (та же логика, что у JSON-колонок ComplexDB в
# models_complex.py). Классы ниже — не таблицы, а форма для
# валидации/сериализации этого JSON.


MAX_BLOCK_EXERCISE_TEXT_LENGTH = 200
MAX_BLOCK_EXERCISE_LOAD_LENGTH = 100

# --- Автоматические схемы -------------------------------------------------
#
# Схема может быть «свободной» (всё текстом, как раньше — система ничего
# не разбирает) или «автоматической»: автор вводит числа (повторения или
# секунды, число кругов, отдых в секундах), и по такой схеме можно
# проходить тренировку с таймерами. Свободные схемы выглядят в данных
# ровно как раньше: новые поля при сохранении опускаются, пока они
# равны значениям по умолчанию (см. _drop_defaults).
#
# Сеты и круги. Комплекс (ProgramBlock) состоит из упражнений по
# порядку; подряд идущие упражнения объединяются в «сет», если у
# следующего group_with_previous=True (суперсет); иначе каждое упражнение
# — отдельный сет. Сколько раз повторять:
#   sequential — «по очереди»: сет 1 свои подходы, затем сет 2 свои
#     (у каждого сета своё число — rounds у его первого упражнения; если
#     оно не задано, берётся ProgramBlock.rounds);
#   interleaved — «по кругу»: сет 1, сет 2, … и так ProgramBlock.rounds
#     кругов подряд.
# Если сет в комплексе один, число повторений — ProgramBlock.rounds.
# Отдых (секунды): rest_within_set — между упражнениями внутри сета;
# rest_between_rounds — между подходами/кругами; rest_between_sets —
# между сетами; rest_after_block — после комплекса, перед следующим.

MAX_ROUNDS = 50
MAX_REST_SECONDS = 3600
MAX_TARGET_REPS = 999
MAX_TARGET_SECONDS = 3600


class ProgramSchemeMode(str, enum.Enum):
    free = "free"
    auto = "auto"


class ProgramTargetKind(str, enum.Enum):
    reps = "reps"
    seconds = "seconds"
    # «Максимум»: человек делает сколько сможет; value — ориентировочное
    # число повторений, с которого он начнёт отмечать результат.
    max = "max"
    # AMRAP: как можно больше повторений за отведённое время. value —
    # секунды таймера, повторения всегда считаются (reps — примерный
    # результат, с которого человек начнёт отмечать свой).
    amrap = "amrap"
    # EMOM: каждый подход — отсчёт таймера на value секунд, после нуля он
    # сам запускается заново, пока не пройдены все подходы (число подходов
    # — как у комплекса). Повторения считаются всегда (reps — примерное
    # число повторений за интервал).
    emom = "emom"


class ProgramBlockOrder(str, enum.Enum):
    sequential = "sequential"
    interleaved = "interleaved"


def _drop_defaults(data: dict, defaults: dict) -> dict:
    """Убирает из словаря поля, равные значениям по умолчанию — так
    данные свободных схем остаются такими же, как до автоматических."""
    for key, default in defaults.items():
        if key in data and data[key] == default:
            del data[key]

    return data


class ProgramItemTarget(SQLModel):
    """
    Ориентир для упражнения в автоматической схеме: повторения, секунды,
    максимум (для него value — примерное число повторений, с которого
    человек начнёт отмечать свой результат), AMRAP (value — секунды
    таймера, повторения за это время считаются всегда) или EMOM (value —
    секунды одного интервала, таймер сам перезапускается на каждый
    подход, повторения считаются всегда). Это рекомендация, фактический
    результат пользователь указывает сам.
    """

    kind: ProgramTargetKind
    value: int
    # Только для упражнений на время: считать ли ещё и повторения,
    # которые человек сделает за это время (например, подтягивания за
    # 30 секунд), и сколько их ожидается. Ориентир повторений во время
    # выполнения не показывается — он нужен как значение по умолчанию,
    # когда человек после подхода отмечает, сколько сделал.
    with_reps: bool = False
    reps: Optional[int] = Field(default=None, ge=1, le=MAX_TARGET_REPS)

    @model_validator(mode="after")
    def _check_value(self) -> "ProgramItemTarget":
        limit = (
            MAX_TARGET_REPS
            if self.kind in (ProgramTargetKind.reps, ProgramTargetKind.max)
            else MAX_TARGET_SECONDS
        )

        if not 1 <= self.value <= limit:
            raise ValueError(
                f"Цель упражнения должна быть от 1 до {limit}"
            )

        # Повторения «за время» бывают только у упражнений на время, у
        # AMRAP и EMOM (там они считаются всегда); ориентир без отметки «считать
        # повторения» не нужен.
        counts_reps = self.kind in (
            ProgramTargetKind.amrap,
            ProgramTargetKind.emom,
        ) or (self.kind == ProgramTargetKind.seconds and self.with_reps)
        self.with_reps = counts_reps

        if not counts_reps:
            self.reps = None

        return self

    @model_serializer(mode="wrap")
    def _serialize(self, handler):
        return _drop_defaults(handler(self), {"with_reps": False, "reps": None})


class ProgramBlockExercise(SQLModel):
    """
    Одно упражнение блока: либо из базы упражнений (exercise_id — на
    него ссылаются, его мышцы идут в картинку схемы), либо свободный
    текст автора (text — упражнение, которого нет в базе; остаётся
    обычной строкой). Ровно одно из двух. Порядок элементов в
    ProgramBlock.items — порядок упражнений, заданный автором (п.15),
    поэтому ссылки на упражнения и свободный текст могут чередоваться.

    load — нагрузка в этом упражнении, необязательная и свободным
    текстом: «20 повторений», «максимум», «технический максимум»,
    «80% от максимума», «30 секунд». Не число и не пара «повторения /
    время» намеренно: у авторов слишком разные способы задавать нагрузку,
    и система не интерпретирует авторскую методику (п.18).
    """

    exercise_id: Optional[str] = None
    text: Optional[str] = None
    load: Optional[str] = None
    # Только для автоматических схем: ориентир (повторения/секунды) и
    # объединение с предыдущим упражнением в один сет.
    target: Optional[ProgramItemTarget] = None
    group_with_previous: bool = False
    # Число подходов сета — задаётся у первого упражнения сета (у
    # остальных упражнений сета не учитывается). Только для порядка
    # «по очереди» при нескольких сетах.
    rounds: Optional[int] = Field(default=None, ge=1, le=MAX_ROUNDS)

    @model_serializer(mode="wrap")
    def _serialize(self, handler):
        return _drop_defaults(
            handler(self),
            {"target": None, "group_with_previous": False, "rounds": None},
        )

    @field_validator("exercise_id", "text", "load")
    @classmethod
    def _blank_is_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        return cleaned or None

    @field_validator("text")
    @classmethod
    def _check_text_length(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value) > MAX_BLOCK_EXERCISE_TEXT_LENGTH:
            raise ValueError(
                "Название упражнения не должно быть длиннее "
                f"{MAX_BLOCK_EXERCISE_TEXT_LENGTH} символов"
            )

        return value

    @field_validator("load")
    @classmethod
    def _check_load_length(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value) > MAX_BLOCK_EXERCISE_LOAD_LENGTH:
            raise ValueError(
                "Нагрузка не должна быть длиннее "
                f"{MAX_BLOCK_EXERCISE_LOAD_LENGTH} символов"
            )

        return value

    @model_validator(mode="after")
    def _exactly_one(self) -> "ProgramBlockExercise":
        if (self.exercise_id is None) == (self.text is None):
            raise ValueError(
                "У упражнения блока должно быть заполнено ровно одно поле: "
                "упражнение из базы или свой текст"
            )

        return self


def structure_exercise_ids(structure: Optional[dict]) -> List[str]:
    """
    Id упражнений из базы, на которые ссылается структура версии (сырой
    JSON из ProgramVersionDB.structure или из ProgramStructure.model_dump).
    Без повторов, в порядке появления. Нужна и для проверки при
    сохранении черновика, и для защиты от удаления упражнения.
    """
    found: dict[str, None] = {}

    for section in (structure or {}).get("sections") or []:
        for scheme in section.get("schemes") or []:
            for block in scheme.get("blocks") or []:
                for item in block.get("items") or []:
                    exercise_id = (item or {}).get("exercise_id")

                    if exercise_id:
                        found[exercise_id] = None

    return list(found)


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
    #
    # УСТАРЕВШЕЕ ПОЛЕ — только чтение: так упражнения хранились, пока
    # они были просто строками. Опубликованные версии неизменяемы, поэтому
    # у старых версий остаётся оно; фронтенд при чтении превращает такие
    # строки в «свои» упражнения (см. items) и при сохранении черновика
    # пишет уже только items, а здесь оставляет пустой список.
    exercises: List[str] = []
    # Упражнения блока по порядку: из базы упражнений или своим текстом
    # (см. ProgramBlockExercise). Если пусто, а exercises нет — блок без
    # упражнений.
    items: List[ProgramBlockExercise] = []
    # "Схема / описание выполнения блока" (п.16) — свободный текст,
    # например "5 × 10" или "4 круга по 10+5+5".
    scheme: Optional[str] = None
    # Примечание автора к блоку (п.17).
    note: Optional[str] = None
    # Отдых между подходами/блоками — тоже свободный текст автора
    # (например, "60-90 секунд" или "полное восстановление"), система
    # не пытается парсить это как число секунд.
    rest: Optional[str] = None
    # Только для автоматических схем (см. описание выше): сколько раз
    # повторяется комплекс/сет, порядок сетов и отдых в секундах.
    rounds: Optional[int] = Field(default=None, ge=1, le=MAX_ROUNDS)
    order: ProgramBlockOrder = ProgramBlockOrder.sequential
    rest_within_set: Optional[int] = Field(
        default=None, ge=0, le=MAX_REST_SECONDS
    )
    rest_between_rounds: Optional[int] = Field(
        default=None, ge=0, le=MAX_REST_SECONDS
    )
    rest_between_sets: Optional[int] = Field(
        default=None, ge=0, le=MAX_REST_SECONDS
    )
    rest_after_block: Optional[int] = Field(
        default=None, ge=0, le=MAX_REST_SECONDS
    )
    # EMOM: упражнения сета, где все цели — EMOM, выполняются не по
    # очереди (у каждого свой интервал), а все вместе за один интервал.
    # Секунды интервала — у первого упражнения сета (у остальных то же
    # число). По умолчанию выключено.
    emom_together: bool = False

    @model_serializer(mode="wrap")
    def _serialize(self, handler):
        return _drop_defaults(
            handler(self),
            {
                "emom_together": False,
                "rounds": None,
                "order": ProgramBlockOrder.sequential.value,
                "rest_within_set": None,
                "rest_between_rounds": None,
                "rest_between_sets": None,
                "rest_after_block": None,
            },
        )


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
    # «Свободная» (как раньше, всё текстом) или «автоматическая» (с
    # числами для прохождения с таймерами).
    mode: ProgramSchemeMode = ProgramSchemeMode.free

    @model_serializer(mode="wrap")
    def _serialize(self, handler):
        return _drop_defaults(
            handler(self), {"mode": ProgramSchemeMode.free.value}
        )


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


def auto_scheme_problems(structure: Optional[dict]) -> List[str]:
    """
    Что не заполнено в автоматических схемах структуры (сырой JSON).
    Пустой список — все автоматические схемы готовы к прохождению.
    Черновик можно сохранять неполным, а публикуется версия только
    когда этот список пуст. Свободные схемы не проверяются.

    Те же правила, что в utils/programAuto.ts на фронтенде (там по ним
    редактор показывает, чего не хватает) — менять только вместе.
    """
    problems: List[str] = []

    for section in (structure or {}).get("sections") or []:
        for scheme_index, scheme in enumerate(section.get("schemes") or []):
            if scheme.get("mode") != ProgramSchemeMode.auto.value:
                continue

            name = (scheme.get("name") or "").strip() or (
                f"Схема {scheme_index + 1}"
            )
            blocks = scheme.get("blocks") or []

            if not any(block.get("items") for block in blocks):
                problems.append(
                    f"Схема «{name}»: добавьте хотя бы один комплекс с "
                    "упражнениями"
                )
                continue

            for block_index, block in enumerate(blocks):
                title = (block.get("title") or "").strip() or (
                    f"Комплекс {block_index + 1}"
                )
                where = f"Схема «{name}», {title}"
                items = block.get("items") or []

                if not items:
                    problems.append(f"{where}: нет упражнений")
                    continue

                if any(not (item or {}).get("target") for item in items):
                    problems.append(
                        f"{where}: у каждого упражнения нужно указать "
                        "повторения, секунды, максимум, AMRAP или EMOM"
                    )

                if any(
                    ((item or {}).get("target") or {}).get("with_reps")
                    and not ((item or {}).get("target") or {}).get("reps")
                    for item in items
                ):
                    problems.append(
                        f"{where}: у упражнения с подсчётом повторений "
                        "укажите их ориентировочное число"
                    )

                set_starts = [
                    item or {}
                    for index, item in enumerate(items)
                    if index == 0 or not (item or {}).get("group_with_previous")
                ]
                sets_count = len(set_starts)

                # Число повторений каждого сета: при нескольких сетах «по
                # очереди» — своё у каждого (по умолчанию как у комплекса),
                # иначе одно на комплекс.
                per_set = (
                    sets_count > 1
                    and block.get("order") != ProgramBlockOrder.interleaved.value
                )
                rounds_per_set = [
                    (first.get("rounds") or block.get("rounds"))
                    if per_set
                    else block.get("rounds")
                    for first in set_starts
                ]

                if not all(rounds_per_set):
                    problems.append(
                        f"{where}: укажите число подходов или кругов"
                    )

                if (
                    max((rounds or 1) for rounds in rounds_per_set) > 1
                    and block.get("rest_between_rounds") is None
                ):
                    problems.append(
                        f"{where}: укажите отдых между подходами или кругами "
                        "(можно 0)"
                    )

                if sets_count > 1 and block.get("rest_between_sets") is None:
                    problems.append(
                        f"{where}: укажите отдых между сетами (можно 0)"
                    )

    return problems


# --- Программа (постоянная сущность, п.2) ---------------------------------


# Описание программы — Markdown, как текст статьи: заголовки, выделение,
# ссылки, картинки и карусели. Картинки загружаются автором в
# uploads/program-descriptions/ (POST /programs/{id}/images) и имеют имя,
# которое выдал save_image. Любой другой адрес картинки в тексте — не наш
# файл: это и пиксели слежения за читателями, и файлы, которые однажды
# пропадут (то же правило, что у статей, см. models_article.py).
MAX_DESCRIPTION_LENGTH = 30_000

PROGRAM_IMAGE_SUBFOLDER = "program-descriptions"
PROGRAM_IMAGE_URL_RE = re.compile(
    r"/uploads/program-descriptions/[0-9a-f]{32}\.(?:jpg|png|webp)"
)

# Картинка в Markdown: ![описание](адрес "подсказка"). Берём только адрес.
_MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(\s*<?([^)\s>]+)")


def program_description_images(description: Optional[str]) -> set[str]:
    """Все картинки программ, на которые ссылается текст описания."""
    return {
        match.group(0)
        for match in PROGRAM_IMAGE_URL_RE.finditer(description or "")
    }


def _validate_description_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    # Символ NUL PostgreSQL в текстовых полях не принимает вовсе.
    value = value.replace("\x00", "").strip()

    if len(value) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(
            f"Описание не длиннее {MAX_DESCRIPTION_LENGTH} символов"
        )

    for url in _MARKDOWN_IMAGE_RE.findall(value):
        if not PROGRAM_IMAGE_URL_RE.fullmatch(url):
            raise ValueError(
                "В описании можно использовать только картинки, "
                "загруженные через редактор"
            )

    return value


class ProgramImageRead(SQLModel):
    """Ответ на загрузку картинки для описания: адрес для текста."""

    url: str


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

    # Проверки — только на входе (создание и правка): описания,
    # написанные до появления разметки, читаются как есть.
    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: str) -> str:
        return _validate_description_text(value) or ""


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

    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _validate_description_text(value)


class ProgramRead(ProgramBase):
    id: int
    author_id: int
    is_published: bool
    current_version_id: Optional[int] = None
    created_at: UtcDatetime
    updated_at: UtcDatetime

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
    created_at: UtcDatetime
    updated_at: UtcDatetime
    published_at: Optional[UtcDatetime] = None


class ProgramVersionSummary(SQLModel):
    """
    Для списка версий программы (п.4.1 "Исторические версии") —
    без структуры целиком, чтобы не тащить весь JSON ради списка на
    странице истории.
    """

    id: int
    version_number: Optional[str] = None
    changelog: Optional[str] = None
    published_at: Optional[UtcDatetime] = None


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
    created_at: UtcDatetime


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
    created_at: UtcDatetime
