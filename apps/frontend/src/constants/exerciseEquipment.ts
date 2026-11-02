import type {
    ExerciseEquipmentKey,
    UniversalEquipment,
} from "../types/exercise";
import type { PlaygroundEquipment } from "../types/playground";

import {
    equipmentCategoryLabels,
    playgroundEquipment,
    type PlaygroundEquipmentCategory,
} from "./playgroundEquipment";

/**
 * Оборудование упражнения — то же, что у площадок
 * (constants/playgroundEquipment.ts), плюс универсальное, которое
 * считается имеющимся на любой площадке. Универсальному оборудованию
 * иконка не нужна: в форме площадки его не отмечают.
 */

export const equipmentCategoryOrder: PlaygroundEquipmentCategory[] = [
    "pullBars",
    "parallelBars",
    "pushBars",
    "climbing",
    "accessories",
];

export const universalEquipment: Record<UniversalEquipment, { name: string }> = {
    verticalPost: { name: "Вертикальный столб" },
};

export const universalEquipmentKeys = Object.keys(
    universalEquipment
) as UniversalEquipment[];

export function isUniversalEquipment(
    key: ExerciseEquipmentKey
): key is UniversalEquipment {
    return key in universalEquipment;
}

export function getEquipmentName(key: ExerciseEquipmentKey): string {
    return isUniversalEquipment(key)
        ? universalEquipment[key].name
        : playgroundEquipment[key].name;
}

export type PlaygroundEquipmentGroup = {
    category: PlaygroundEquipmentCategory;
    label: string;
    items: PlaygroundEquipment[];
};

const allPlaygroundEquipment = Object.keys(
    playgroundEquipment
) as PlaygroundEquipment[];

/** Оборудование площадок по группам — в порядке показа в форме. */
export const playgroundEquipmentGroups: PlaygroundEquipmentGroup[] =
    equipmentCategoryOrder.map((category) => ({
        category,
        label: equipmentCategoryLabels[category],
        items: allPlaygroundEquipment.filter(
            (key) => playgroundEquipment[key].category === category
        ),
    }));
