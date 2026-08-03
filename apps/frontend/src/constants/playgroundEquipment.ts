import type {
    PlaygroundEquipment,
} from "../types/playground";

export type PlaygroundEquipmentCategory =
    | "pullBars"
    | "parallelBars"
    | "pushBars"
    | "climbing"
    | "accessories";

type PlaygroundEquipmentInfo = {

    name: string;

    icon: string;

    category: PlaygroundEquipmentCategory;

};

export const equipmentCategoryLabels: Record<PlaygroundEquipmentCategory, string> = {

    pullBars: "Турники",

    parallelBars: "Параллельные перекладины",

    pushBars: "Перекладины",

    climbing: "Лазательные элементы",

    accessories: "Дополнительно",

};

export const playgroundEquipment: Record<PlaygroundEquipment, PlaygroundEquipmentInfo> = {

    widePullBar: {

        name:
            "Широкий турник (>150 см)",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    highPullBar: {

        name:
            "Высокий турник (>200 см)",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    mediumPullBar: {

        name:
            "Средний турник (180–200 см)",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    lowPullBar: {

        name:
            "Низкий турник (160–180 см)",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    middlePushBar: {

        name:
            "Средняя перекладина (50–100 см)",

        icon:
            "💪",

        category:
            "pushBars",

    },

    lowPushBar: {

        name:
            "Низкая перекладина (<50 см)",

        icon:
            "💪",

        category:
            "pushBars",

    },

    labyrinth: {

        name:
            "Лабиринт",

        icon:
            "🧗",

        category:
            "parallelBars",

    },

    highParallelBars: {

        name:
            "Высокие брусья (>160 см)",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    mediumParallelBars: {

        name:
            "Средние брусья (140–160 см)",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    parallettes: {

        name:
            "Паралетсы (30–100 см)",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    pushUpBars: {

        name:
            "Упоры (<30 см)",

        icon:
            "💪",

        category:
            "parallelBars",

    },

    wideMonkeyBars: {

        name:
            "Рукоход (широкий)",

        icon:
            "🐒",

        category:
            "climbing",

    },

    narrowMonkeyBars: {

        name:
            "Рукоход (узкий)",

        icon:
            "🐒",

        category:
            "climbing",

    },

    swedishWall: {

        name:
            "Шведская стенка",

        icon:
            "🪜",

        category:
            "climbing",

    },

        Bench: {

        name:
            "Скамья",

        icon:
            "🪑🪑",

        category:
            "accessories",

    },

    inclineBench: {

        name:
            "Наклонная скамья",

        icon:
            "🪑",

        category:
            "accessories",

    },

    posts: {

        name:
            "Столбики",

        icon:
            "🪵",

        category:
            "accessories",

    },

    rings: {

        name:
            "Кольца",

        icon:
            "⭕",

        category:
            "accessories",

    },

    rope: {

        name:
            "Канат",

        icon:
            "🪢",

        category:
            "climbing",

    },

};