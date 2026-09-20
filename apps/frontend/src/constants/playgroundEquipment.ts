import type {
    PlaygroundEquipment,
} from "../types/playground";

import widePullBarIcon from "../assets/equipment/widePullBar.png";
import highPullBarIcon from "../assets/equipment/highPullBar.png";
import mediumPullBarIcon from "../assets/equipment/mediumPullBar.png";
import lowPullBarIcon from "../assets/equipment/lowPullBar.png";
import middlePushBarIcon from "../assets/equipment/middlePushBar.png";
import lowPushBarIcon from "../assets/equipment/lowPushBar.png";
import labyrinthIcon from "../assets/equipment/labyrinth.png";
import highParallelBarsIcon from "../assets/equipment/highParallelBars.png";
import mediumParallelBarsIcon from "../assets/equipment/mediumParallelBars.png";
import parallettesIcon from "../assets/equipment/parallettes.png";
import pushUpBarsIcon from "../assets/equipment/pushUpBars.png";
import wideMonkeyBarsIcon from "../assets/equipment/wideMonkeyBars.png";
import narrowMonkeyBarsIcon from "../assets/equipment/narrowMonkeyBars.png";
import swedishWallIcon from "../assets/equipment/swedishWall.png";
import benchIcon from "../assets/equipment/Bench.png";
import inclineBenchIcon from "../assets/equipment/inclineBench.png";
import postsIcon from "../assets/equipment/posts.png";
import ringsIcon from "../assets/equipment/rings.png";
import ropeIcon from "../assets/equipment/rope.png";

export type PlaygroundEquipmentCategory =
    | "pullBars"
    | "parallelBars"
    | "pushBars"
    | "climbing"
    | "accessories";

type PlaygroundEquipmentInfo = {

    name: string;

    /** Путь к иконке 100x100 (см. src/assets/equipment/), а не эмодзи —
     *  подставляется в <img src=...>, а не выводится как текст.
     *  Реальный размер на странице задаётся CSS/HTML-атрибутами
     *  width/height у конкретного <img> (playground-equipment.css,
     *  PlaygroundForm.tsx) и от исходного разрешения файла не зависит —
     *  100x100 даёт более чёткую картинку на retina-экранах, но не
     *  меняет то, как крупно иконка выглядит на странице. */
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
            widePullBarIcon,

        category:
            "pullBars",

    },

    highPullBar: {

        name:
            "Высокий турник (>200 см)",

        icon:
            highPullBarIcon,

        category:
            "pullBars",

    },

    mediumPullBar: {

        name:
            "Средний турник (180–200 см)",

        icon:
            mediumPullBarIcon,

        category:
            "pullBars",

    },

    lowPullBar: {

        name:
            "Низкий турник (160–180 см)",

        icon:
            lowPullBarIcon,

        category:
            "pullBars",

    },

    middlePushBar: {

        name:
            "Средняя перекладина (50–100 см)",

        icon:
            middlePushBarIcon,

        category:
            "pushBars",

    },

    lowPushBar: {

        name:
            "Низкая перекладина (<50 см)",

        icon:
            lowPushBarIcon,

        category:
            "pushBars",

    },

    labyrinth: {

        name:
            "Лабиринт",

        icon:
            labyrinthIcon,

        category:
            "parallelBars",

    },

    highParallelBars: {

        name:
            "Высокие брусья (>160 см)",

        icon:
            highParallelBarsIcon,

        category:
            "parallelBars",

    },

    mediumParallelBars: {

        name:
            "Средние брусья (140–160 см)",

        icon:
            mediumParallelBarsIcon,

        category:
            "parallelBars",

    },

    parallettes: {

        name:
            "Паралетсы (30–100 см)",

        icon:
            parallettesIcon,

        category:
            "parallelBars",

    },

    pushUpBars: {

        name:
            "Упоры (<30 см)",

        icon:
            pushUpBarsIcon,

        category:
            "parallelBars",

    },

    wideMonkeyBars: {

        name:
            "Рукоход (широкий)",

        icon:
            wideMonkeyBarsIcon,

        category:
            "climbing",

    },

    narrowMonkeyBars: {

        name:
            "Рукоход (узкий)",

        icon:
            narrowMonkeyBarsIcon,

        category:
            "climbing",

    },

    swedishWall: {

        name:
            "Шведская стенка",

        icon:
            swedishWallIcon,

        category:
            "climbing",

    },

        Bench: {

        name:
            "Скамья",

        icon:
            benchIcon,

        category:
            "accessories",

    },

    inclineBench: {

        name:
            "Наклонная скамья",

        icon:
            inclineBenchIcon,

        category:
            "accessories",

    },

    posts: {

        name:
            "Столбики",

        icon:
            postsIcon,

        category:
            "accessories",

    },

    rings: {

        name:
            "Кольца",

        icon:
            ringsIcon,

        category:
            "accessories",

    },

    rope: {

        name:
            "Канат",

        icon:
            ropeIcon,

        category:
            "climbing",

    },

};
