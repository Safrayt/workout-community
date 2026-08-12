import type { Event } from "../types/event";

/**
 * Моковые события намеренно распределены вокруг текущей даты
 * разработки (август 2026) — часть уже прошла (для проверки
 * фильтра "Завершённые" и сортировки), часть приходится на
 * сегодня/завтра/эту неделю/этот месяц (для проверки фильтра
 * "Дата"), часть — на будущие месяцы.
 *
 * `city` и `location` всегда соответствуют площадке (`playgroundId`),
 * как это делает EventContext.addEvent: city = playground.locality,
 * location = playground.address.
 */
export const events: Event[] = [
    // --- Прошедшие события ---
    {
        id: "1",
        title: "Открытие сезона BarBosS",
        description:
            "Первая совместная тренировка сезона: разминка, круговая тренировка и знакомство с новичками.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "1",
        startDate: "2026-07-05T18:00:00",
        expectedParticipants: 13,
    },
    {
        id: "3",
        title: "Воркаут-марафон выходного дня",
        description:
            "Длинная тренировка с элементами стато и акробатики, подойдёт продвинутым участникам.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "3",
        startDate: "2026-07-19T10:00:00",
        expectedParticipants: 9,
    },
    {
        id: "4",
        title: "Вечерняя growth-тренировка",
        description:
            "Работа над силовыми элементами: подтягивания, отжимания на брусьях, статика.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "5",
        startDate: "2026-08-02T19:00:00",
        expectedParticipants: 7,
    },
    {
        id: "5",
        title: "Утренняя тренировка для новичков",
        description:
            "Базовая техника подтягиваний и отжиманий, разбор техники безопасности на турниках.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "7",
        startDate: "2026-08-08T09:00:00",
        expectedParticipants: 6,
    },

    // --- Сегодня / завтра ---
    {
        id: "6",
        title: "Общая тренировка BarBosS",
        description:
            "Стандартная еженедельная тренировка сообщества, открыта для всех уровней подготовки.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "1",
        startDate: "2026-08-11T19:00:00",
        expectedParticipants: 12,
    },
    {
        id: "7",
        title: "Утренняя растяжка и лёгкая тренировка",
        description:
            "Спокойная тренировка для восстановления: растяжка, лёгкая кардионагрузка, базовые элементы.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "6",
        startDate: "2026-08-12T10:00:00",
        expectedParticipants: 5,
    },

    // --- Эта неделя ---
    {
        id: "8",
        title: "Силовая тренировка на турниках",
        description:
            "Фокус на подтягиваниях и статических элементах: флажок, уголок, передний вис.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "9",
        startDate: "2026-08-14T18:30:00",
        expectedParticipants: 10,
    },
    {
        id: "9",
        title: "Суббота на турниках",
        description:
            "Свободная тренировка: каждый работает над своими элементами, тренеры подскажут технику.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "4",
        startDate: "2026-08-16T09:00:00",
        expectedParticipants: 14,
    },

    // --- Этот месяц ---
    {
        id: "2",
        title: "Общая тренировка BarBosS",
        description:
            "Лёгкая групповая тренировка для всех уровней подготовки.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "1",
        startDate: "2026-08-18T10:00:00",
        expectedParticipants: 13,
    },
    {
        id: "10",
        title: "Вечерняя тренировка выходного дня",
        description:
            "Совместная тренировка с элементами игровой разминки и командных упражнений.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "8",
        startDate: "2026-08-22T18:00:00",
        expectedParticipants: 8,
    },
    {
        id: "11",
        title: "Тренировка выходного дня",
        description:
            "Разбор сложных элементов на брусьях и рукоходе, работа в парах.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "2",
        startDate: "2026-08-28T11:00:00",
        expectedParticipants: 11,
    },

    // --- Будущие месяцы ---
    {
        id: "12",
        title: "Общая тренировка в начале осени",
        description:
            "Еженедельная общая тренировка сообщества после летнего перерыва.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "1",
        startDate: "2026-09-05T18:00:00",
        expectedParticipants: 9,
    },
    {
        id: "13",
        title: "Общая тренировка в Парке Победы",
        description:
            "Еженедельная общая тренировка сообщества.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "1",
        startDate: "2026-09-19T11:00:00",
        expectedParticipants: 8,
    },
    {
        id: "14",
        title: "Осенний воркаут-фестиваль",
        description:
            "Большая совместная тренировка с мастер-классами от опытных участников сообщества.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "2",
        creatorId: "10",
        startDate: "2026-10-03T10:00:00",
        expectedParticipants: 20,
    },
    {
        id: "15",
        title: "Зимняя разминка перед сезоном",
        description:
            "Лёгкая тренировка для поддержания формы в холодное время года, тёплая одежда приветствуется.",
        city: "Балашиха",
        location: "ш. Энтузиастов, 54А",
        playgroundId: "1",
        creatorId: "3",
        startDate: "2026-11-15T11:00:00",
        expectedParticipants: 6,
    },
];
