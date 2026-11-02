import type { Exercise } from "../types/exercise";
import type { PlaygroundEquipment } from "../types/playground";

import {
    getEquipmentName,
    isUniversalEquipment,
    playgroundEquipmentGroups,
} from "../constants/exerciseEquipment";

type ExerciseEquipmentSpec = Pick<Exercise, "equipment" | "noEquipment">;

/**
 * Подходит ли упражнение к площадке с таким оборудованием:
 * - «без оборудования» — подходит везде;
 * - универсальное оборудование (вертикальный столб) есть везде;
 * - иначе достаточно, чтобы на площадке было хотя бы одно из
 *   оборудования упражнения.
 * Упражнение, у которого оборудование ещё не указано, не подходит
 * никуда — неизвестно, что для него нужно.
 */
export function isExerciseAvailableAt(
    exercise: ExerciseEquipmentSpec,
    playgroundEquipment: PlaygroundEquipment[]
): boolean {
    if (exercise.noEquipment) {
        return true;
    }

    return exercise.equipment.some(
        (item) =>
            isUniversalEquipment(item) || playgroundEquipment.includes(item)
    );
}

/**
 * Оборудование упражнения одной строкой. Если отмечена вся группа
 * (например, все турники), пишем название группы, а не перечисляем
 * каждый пункт.
 */
export function describeExerciseEquipment(
    exercise: ExerciseEquipmentSpec
): string {
    if (exercise.noEquipment) {
        return "Без оборудования";
    }

    if (exercise.equipment.length === 0) {
        return "Не указано";
    }

    const selected = new Set(exercise.equipment);
    const parts: string[] = [];

    for (const group of playgroundEquipmentGroups) {
        const chosen = group.items.filter((item) => selected.has(item));

        if (chosen.length === 0) {
            continue;
        }

        const isWholeGroup =
            group.category !== "accessories" &&
            group.items.length > 1 &&
            chosen.length === group.items.length;

        if (isWholeGroup) {
            parts.push(group.label);
        } else {
            chosen.forEach((item) => parts.push(getEquipmentName(item)));
        }
    }

    exercise.equipment
        .filter(isUniversalEquipment)
        .forEach((item) => parts.push(getEquipmentName(item)));

    return parts.join(", ");
}
