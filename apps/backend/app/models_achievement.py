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


class Achievement(SQLModel):
    """
    Не таблица в базе: каталог достижений — это фиксированный набор,
    который ни один эндпоинт не создаёт и не редактирует, точно так
    же, как data/achievements.ts на фронтенде — обычный статичный
    массив, а не что-то, что приходит с сервера через CRUD.
    """

    id: str
    title: str
    description: str
    icon: str
    category: AchievementCategory
    rarity: AchievementRarity
    experience: int
    condition: AchievementCondition
    target: int


# 1-в-1 копия data/achievements.ts. Источника правды на два языка нет,
# так что при добавлении нового достижения на фронте не забыть
# продублировать его и сюда.
ACHIEVEMENTS: List[Achievement] = [
    Achievement(
        id="first-event",
        title="Го тренить, я создал",
        description="Создать первое мероприятие.",
        icon="📅",
        category=AchievementCategory.events,
        rarity=AchievementRarity.common,
        experience=50,
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
        experience=50,
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
        experience=25,
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
        experience=100,
        condition=AchievementCondition.attended_events,
        target=5,
    ),
]


class AchievementProgress(SQLModel):
    achievement: Achievement
    progress: int
    unlocked: bool
