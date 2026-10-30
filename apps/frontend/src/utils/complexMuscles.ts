import { muscleGroups } from "../constants/muscleGroups";

import type { Exercise, MuscleGroupKey } from "../types/exercise";

export type ComplexMuscles = {
    /** Мышцы, на которые нацелено хотя бы одно упражнение комплекса. */
    target: MuscleGroupKey[];

    /**
     * Мышцы, которые работают в помощь хотя бы в одном упражнении и при
     * этом не являются целевыми ни в одном (целевая важнее: мышца,
     * которая где-то основная, на карте комплекса не должна оказаться
     * "вспомогательной").
     */
    auxiliary: MuscleGroupKey[];
};

/**
 * Общая мышечная группа комплекса — объединение мышц всех его
 * упражнений. Порядок — как в списке мышечных групп (сверху вниз по
 * телу), а не в порядке упражнений: так список на странице не "прыгает"
 * при смене порядка упражнений.
 */
export function getComplexMuscles(exercises: Exercise[]): ComplexMuscles {
    const target = new Set<MuscleGroupKey>();
    const auxiliary = new Set<MuscleGroupKey>();

    for (const exercise of exercises) {
        exercise.targetMuscles.forEach((muscle) => target.add(muscle));
        exercise.auxiliaryMuscles.forEach((muscle) => auxiliary.add(muscle));
    }

    const inBodyOrder = (set: Set<MuscleGroupKey>) =>
        muscleGroups
            .map((group) => group.key)
            .filter((key) => set.has(key));

    return {
        target: inBodyOrder(target),
        auxiliary: inBodyOrder(new Set([...auxiliary].filter((m) => !target.has(m)))),
    };
}
