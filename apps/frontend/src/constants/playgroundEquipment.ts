import type {
    PlaygroundEquipment,
} from "../types/playground";

type PlaygroundEquipmentInfo = {

    name: string;

    icon: string;

    category:
        | "pullBars"
        | "parallelBars"
        | "pushBars"
        | "climbing"
        | "accessories";

};

export const playgroundEquipment: Record<
    PlaygroundEquipment,
    PlaygroundEquipmentInfo
> = {

    widePullBar: {

        name:
            "Широкий турник",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    highPullBar: {

        name:
            "Высокий турник",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    mediumPullBar: {

        name:
            "Средний турник",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    lowPullBar: {

        name:
            "Низкий турник",

        icon:
            "🏋️",

        category:
            "pullBars",

    },

    middlePushBar: {

        name:
            "Средняя лавка",

        icon:
            "💪",

        category:
            "pushBars",

    },

    lowPushBar: {

        name:
            "Низкая лавка",

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
            "climbing",

    },

    highParallelBars: {

        name:
            "Высокие брусья",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    mediumParallelBars: {

        name:
            "Средние брусья",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    parallettes: {

        name:
            "Паралетсы",

        icon:
            "🤸",

        category:
            "parallelBars",

    },

    pushUpBars: {

        name:
            "Упоры для отжиманий",

        icon:
            "💪",

        category:
            "pushBars",

    },

    wideMonkeyBars: {

        name:
            "Широкий рукоход",

        icon:
            "🐒",

        category:
            "climbing",

    },

    narrowMonkeyBars: {

        name:
            "Узкий рукоход",

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
            "Столбы",

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