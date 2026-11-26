import { useMemo, useState } from "react";

import Button from "../ui/Button/Button";
import WeightField from "../WeightField/WeightField";

import "../../styles/components/workout-entry-exercises-field.css";

import { useExercises } from "../../context/ExerciseContext";
import type {
    NewPerformedExercise,
    PerformedExerciseUnit,
} from "../../types/performedExercise";
import {
    MAX_PERFORMED_EXERCISES,
    MAX_SET_VALUE,
    MAX_SETS_PER_EXERCISE,
    nextExerciseKey,
} from "../../utils/performedExercises";

/** Сколько найденных упражнений показывать в выпадающем списке. */
const SEARCH_RESULTS_LIMIT = 8;

type WorkoutEntryExercisesFieldProps = {
    value: NewPerformedExercise[];

    /** Любая правка пользователя — по ней форма перестаёт считать
     *  упражнения подставленными из схемы. */
    onChange: (next: NewPerformedExercise[]) => void;
};

/**
 * Необязательный разбор тренировки по упражнениям: у каждого упражнения
 * результат каждого подхода (5, 4, 2). Упражнения можно взять из схемы
 * (форма подставляет их сама), найти в базе упражнений или добавить
 * своим названием. Текст записи это не заменяет и не требует.
 */
export default function WorkoutEntryExercisesField({
    value,
    onChange,
}: WorkoutEntryExercisesFieldProps) {
    const { exercises: knownExercises } = useExercises();

    const [query, setQuery] = useState("");

    const trimmedQuery = query.trim().toLowerCase();

    const matches = useMemo(() => {
        if (!trimmedQuery) {
            return [];
        }

        return knownExercises
            .filter(
                (exercise) =>
                    exercise.name.toLowerCase().includes(trimmedQuery) ||
                    (exercise.otherNames ?? []).some((name) =>
                        name.toLowerCase().includes(trimmedQuery)
                    )
            )
            .slice(0, SEARCH_RESULTS_LIMIT);
    }, [knownExercises, trimmedQuery]);

    const isFull = value.length >= MAX_PERFORMED_EXERCISES;

    function updateRow(
        key: string,
        patch: Partial<NewPerformedExercise>
    ) {
        onChange(
            value.map((row) =>
                row.key === key ? { ...row, ...patch } : row
            )
        );
    }

    function addRow(row: Omit<NewPerformedExercise, "key">) {
        if (isFull) {
            return;
        }

        onChange([...value, { ...row, key: nextExerciseKey() }]);
        setQuery("");
    }

    function setSetValue(row: NewPerformedExercise, index: number, raw: string) {
        const parsed = Math.floor(Number(raw));
        const next = Number.isFinite(parsed)
            ? Math.min(MAX_SET_VALUE, Math.max(0, parsed))
            : 0;

        updateRow(row.key, {
            sets: row.sets.map((item, itemIndex) =>
                itemIndex === index ? next : item
            ),
        });
    }

    function addSet(row: NewPerformedExercise) {
        if (row.sets.length >= MAX_SETS_PER_EXERCISE) {
            return;
        }

        // Новый подход сразу предлагает то же число, что и прошлый.
        const last = row.sets[row.sets.length - 1] ?? 0;

        updateRow(row.key, { sets: [...row.sets, last] });
    }

    function removeSet(row: NewPerformedExercise, index: number) {
        updateRow(row.key, {
            sets: row.sets.filter((_, itemIndex) => itemIndex !== index),
        });
    }

    return (
        <div className="exercises-field">
            {value.length > 0 && (
                <ul className="exercises-field__list">
                    {value.map((row) => (
                        <li key={row.key} className="exercises-field__row">
                            <div className="exercises-field__row-head">
                                <span className="exercises-field__name">
                                    {row.name}
                                </span>

                                <select
                                    className="exercises-field__unit"
                                    aria-label={`Единица: ${row.name}`}
                                    value={row.unit}
                                    onChange={(event) =>
                                        updateRow(row.key, {
                                            unit: event.target
                                                .value as PerformedExerciseUnit,
                                        })
                                    }
                                >
                                    <option value="reps">повторения</option>
                                    <option value="seconds">секунды</option>
                                </select>

                                <button
                                    type="button"
                                    className="exercises-field__remove"
                                    aria-label={`Убрать упражнение ${row.name}`}
                                    onClick={() =>
                                        onChange(
                                            value.filter(
                                                (item) => item.key !== row.key
                                            )
                                        )
                                    }
                                >
                                    Убрать
                                </button>
                            </div>

                            <div className="exercises-field__sets">
                                {row.sets.map((setValue, index) => (
                                    <label
                                        key={index}
                                        className="exercises-field__set"
                                    >
                                        <span className="exercises-field__set-label">
                                            {index + 1}
                                        </span>

                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            max={MAX_SET_VALUE}
                                            className="exercises-field__input"
                                            aria-label={`${row.name}, подход ${index + 1}`}
                                            value={setValue === 0 ? "" : setValue}
                                            onChange={(event) =>
                                                setSetValue(
                                                    row,
                                                    index,
                                                    event.target.value
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="exercises-field__set-remove"
                                            aria-label={`Убрать подход ${index + 1}`}
                                            onClick={() =>
                                                removeSet(row, index)
                                            }
                                        >
                                            ×
                                        </button>
                                    </label>
                                ))}

                                <button
                                    type="button"
                                    className="exercises-field__add-set"
                                    disabled={
                                        row.sets.length >=
                                        MAX_SETS_PER_EXERCISE
                                    }
                                    onClick={() => addSet(row)}
                                >
                                    + подход
                                </button>
                            </div>

                            <div className="exercises-field__weight">
                                <WeightField
                                    value={row.weightKg}
                                    ariaContext={row.name}
                                    onChange={(weightKg) =>
                                        updateRow(row.key, { weightKg })
                                    }
                                />
                            </div>

                            {row.sets.length === 0 && (
                                <p className="exercises-field__empty-hint">
                                    Подходов нет — упражнение не будет
                                    сохранено и в счёт не пойдёт.
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="exercises-field__add">
                <input
                    type="text"
                    className="exercises-field__search"
                    placeholder={
                        isFull
                            ? "Достигнут предел упражнений"
                            : "Добавить упражнение: начните вводить название"
                    }
                    aria-label="Добавить упражнение"
                    disabled={isFull}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />

                {trimmedQuery && (
                    <ul className="exercises-field__results">
                        {matches.map((exercise) => (
                            <li key={exercise.id}>
                                <button
                                    type="button"
                                    className="exercises-field__result"
                                    onClick={() =>
                                        addRow({
                                            exerciseId: exercise.id,
                                            name: exercise.name,
                                            unit: "reps",
                                            sets: [0],
                                        })
                                    }
                                >
                                    {exercise.name}
                                </button>
                            </li>
                        ))}

                        <li>
                            <Button
                                type="button"
                                variant="outline"
                                className="exercises-field__custom"
                                onClick={() =>
                                    addRow({
                                        name: query.trim(),
                                        unit: "reps",
                                        sets: [0],
                                    })
                                }
                            >
                                Добавить своё: «{query.trim()}»
                            </Button>
                        </li>
                    </ul>
                )}
            </div>
        </div>
    );
}
