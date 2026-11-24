import enum
from typing import List

from sqlmodel import SQLModel


class AchievementCategory(str, enum.Enum):
    community = "community"
    events = "events"
    playgrounds = "playgrounds"
    training = "training"
    collection = "collection"


class AchievementRarity(str, enum.Enum):
    common = "common"
    rare = "rare"
    epic = "epic"
    legendary = "legendary"


class AchievementCondition(str, enum.Enum):
    created_events = "created-events"
    created_playgrounds = "created-playgrounds"
    registrations = "registrations"
    attended_events = "attended-events"

    # По записям дневника тренировок (учитываются все записи автора, в
    # том числе скрытые настройками приватности: видимость самих
    # достижений регулирует отдельная настройка achievements_visible).
    #
    # Температура берётся из записи (WorkoutEntry.temperature_c — её
    # сервер сохраняет при создании записи по погоде на площадке), так
    # что запись без площадки или без известной погоды в счёт не идёт.
    # «При −10» — это −10 °C и холоднее, поэтому тренировка при −20 °C
    # засчитывается в оба достижения.
    workouts_at_minus_10 = "workouts-at-minus-10"
    workouts_at_minus_20 = "workouts-at-minus-20"

    # Записи, у которых отмечена программа тренировок.
    workouts_with_program = "workouts-with-program"

    # Наибольшее число записей на какой-то одной площадке.
    workouts_on_one_playground = "workouts-on-one-playground"


class Achievement(SQLModel):
    """
    Не таблица в базе: каталог достижений — это фиксированный набор,
    который ни один эндпоинт не создаёт и не редактирует, а просто
    отдаёт готовый статичный список ACHIEVEMENTS ниже.
    """

    id: str
    title: str
    description: str
    icon: str
    category: AchievementCategory
    rarity: AchievementRarity
    condition: AchievementCondition
    target: int


# Единственный источник правды: фронтенд берёт и каталог, и прогресс
# с сервера (GET /achievements/progress), своей копии списка там нет.
ACHIEVEMENTS: List[Achievement] = [
    Achievement(
        id="first-event",
        title="Го тренить, я создал",
        description="Создать первое мероприятие.",
        icon="📅",
        category=AchievementCategory.events,
        rarity=AchievementRarity.common,
        condition=AchievementCondition.created_events,
        target=1,
    ),
    Achievement(
        id="first-playground",
        title="Смотри, что нашёл!",
        description="Добавить первую найденную площадку.",
        icon="🗺️",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.common,
        condition=AchievementCondition.created_playgrounds,
        target=1,
    ),
    Achievement(
        id="first-registration",
        title="Первый раз в первый класс",
        description="Записаться на первое мероприятие.",
        icon="🤝",
        category=AchievementCategory.community,
        rarity=AchievementRarity.common,
        condition=AchievementCondition.registrations,
        target=1,
    ),
    Achievement(
        id="five-events",
        title="Я был там Гендальф",
        description="Посетить пять мероприятий.",
        icon="🏆",
        category=AchievementCategory.events,
        rarity=AchievementRarity.rare,
        condition=AchievementCondition.attended_events,
        target=5,
    ),
    Achievement(
        id="ice",
        title="Айс!",
        description="Тренировка при -10 градусах.",
        icon="❄️",
        category=AchievementCategory.training,
        rarity=AchievementRarity.rare,
        condition=AchievementCondition.workouts_at_minus_10,
        target=1,
    ),
    Achievement(
        id="freshness-seekers",
        title="Отморозки в поиске свежести",
        description="Тренировка при -20 градусах.",
        icon="🥶",
        category=AchievementCategory.training,
        rarity=AchievementRarity.epic,
        condition=AchievementCondition.workouts_at_minus_20,
        target=1,
    ),
    Achievement(
        id="have-a-plan",
        title="У меня есть план",
        description=(
            "10 тренировочных записей с отмеченной программой тренировок."
        ),
        icon="📋",
        category=AchievementCategory.training,
        rarity=AchievementRarity.common,
        condition=AchievementCondition.workouts_with_program,
        target=10,
    ),
    Achievement(
        id="plan-is-duty",
        title="Выполнение плана - долг, перевыполнение - честь",
        description=(
            "50 тренировочных записей с отмеченной программой тренировок."
        ),
        icon="🎯",
        category=AchievementCategory.training,
        rarity=AchievementRarity.rare,
        condition=AchievementCondition.workouts_with_program,
        target=50,
    ),
    Achievement(
        id="tourist",
        title="Турист",
        description="10 площадок добавлено.",
        icon="🧭",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.common,
        condition=AchievementCondition.created_playgrounds,
        target=10,
    ),
    Achievement(
        id="traveler",
        title="Путешественник",
        description="25 площадок добавлено.",
        icon="🎒",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.rare,
        condition=AchievementCondition.created_playgrounds,
        target=25,
    ),
    Achievement(
        id="cartographer",
        title="Картограф",
        description="50 площадок добавлено.",
        icon="📍",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.epic,
        condition=AchievementCondition.created_playgrounds,
        target=50,
    ),
    Achievement(
        id="pilgrim",
        title="Пилигрим",
        description="100 площадок добавлено.",
        icon="🌍",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.legendary,
        condition=AchievementCondition.created_playgrounds,
        target=100,
    ),
    Achievement(
        id="my-swamp",
        title="Это моё болото",
        description="Провести 100 тренировок на одной площадке.",
        icon="🐸",
        category=AchievementCategory.playgrounds,
        rarity=AchievementRarity.epic,
        condition=AchievementCondition.workouts_on_one_playground,
        target=100,
    ),
]


class AchievementProgress(SQLModel):
    achievement: Achievement
    progress: int
    unlocked: bool
