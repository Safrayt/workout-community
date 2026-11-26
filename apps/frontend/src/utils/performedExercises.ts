import type {
    NewPerformedExercise,
    PerformedExerciseUnit,
} from "../types/performedExercise";
import type { ProgramBlockItem, ProgramScheme } from "../types/program";

import { buildRunSteps } from "./programRun";

/** Верхняя граница числа упражнений и подходов — как на сервере. */
export const MAX_PERFORMED_EXERCISES = 30;
export const MAX_SETS_PER_EXERCISE = 100;
export const MAX_SET_VALUE = 9999;

let keyCounter = 0;

/** Новый ключ строки формы (только для React, на сервер не уходит). */
export function nextExerciseKey(): string {
    keyCounter += 1;

    return `exercise-${Date.now()}-${keyCounter}`;
}

function itemIdentity(
    item: ProgramBlockItem,
    getName: (exerciseId: string) => string | undefined
): Pick<NewPerformedExercise, "exerciseId" | "name"> {
    return item.kind === "exercise"
        ? {
              exerciseId: item.exerciseId,
              name: getName(item.exerciseId) ?? item.exerciseId,
          }
        : { name: item.text };
}

/**
 * Упражнения записи из схемы программы: считаем, что тренировка прошла
 * по схеме, и подставляем её числа.
 *
 * У автоматической схемы числа есть: подходы берутся из её прохождения
 * (buildRunSteps) — повторения (у «максимума» ориентир, у AMRAP и EMOM
 * — ожидаемые повторения за интервал) или секунды (упражнение на время).
 * Одно упражнение в одном комплексе — одна строка со всеми подходами.
 * У «свободной» схемы чисел нет (нагрузка там — текст автора), поэтому
 * упражнения из базы и свои появляются без подходов: человек впишет их
 * сам, а пока подходов нет, в счёт они не идут.
 */
export function buildPerformedFromScheme(
    scheme: ProgramScheme,
    getName: (exerciseId: string) => string | undefined
): NewPerformedExercise[] {
    const rows = new Map<string, NewPerformedExercise>();

    function addSet(
        groupKey: string,
        item: ProgramBlockItem,
        unit: PerformedExerciseUnit,
        value: number
    ) {
        let row = rows.get(groupKey);

        if (!row) {
            row = {
                key: nextExerciseKey(),
                ...itemIdentity(item, getName),
                unit,
                sets: [],
                ...(item.weightKg ? { weightKg: item.weightKg } : {}),
            };
            rows.set(groupKey, row);
        }

        if (value >= 1 && value <= MAX_SET_VALUE) {
            row.sets.push(Math.floor(value));
        }
    }

    if (scheme.mode === "auto") {
        for (const step of buildRunSteps(scheme)) {
            if (step.together) {
                for (const entry of step.together) {
                    addSet(entry.groupKey, entry.item, "reps", entry.reps);
                }

                continue;
            }

            if (step.targetKind === "seconds") {
                addSet(step.groupKey, step.item, "seconds", step.targetValue);
            } else if (
                step.targetKind === "amrap" ||
                step.targetKind === "emom"
            ) {
                addSet(step.groupKey, step.item, "reps", step.targetReps);
            } else {
                addSet(step.groupKey, step.item, "reps", step.targetValue);
            }
        }
    } else {
        scheme.blocks.forEach((block, blockIndex) => {
            block.items.forEach((item, itemIndex) => {
                const groupKey = `${blockIndex}:${itemIndex}`;

                rows.set(groupKey, {
                    key: nextExerciseKey(),
                    ...itemIdentity(item, getName),
                    unit: "reps",
                    sets: [],
                });
            });
        });
    }

    return [...rows.values()].slice(0, MAX_PERFORMED_EXERCISES);
}

/** «+10 кг» (утяжелитель) или «−20 кг, помощь» (резинка, гравитрон). */
export function formatWeight(weightKg: number | undefined): string {
    if (!weightKg) {
        return "";
    }

    const kg = Math.abs(weightKg);

    return weightKg > 0 ? `+${kg} кг` : `−${kg} кг, помощь`;
}

/** Подходы в одну строку: «5 · 4 · 2» и единица измерения. */
export function formatSets(
    sets: number[],
    unit: PerformedExerciseUnit
): string {
    return `${sets.join(" · ")} ${unit === "seconds" ? "с" : "повт."}`;
}
