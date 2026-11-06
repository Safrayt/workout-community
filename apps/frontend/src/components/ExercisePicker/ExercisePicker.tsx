import { useMemo } from "react";

import "../../styles/components/exercise-picker.css";

import ExerciseSearchBox from "../ExerciseSearchBox/ExerciseSearchBox";

import { useExercises } from "../../context/ExerciseContext";

import { muscleGroupLabels } from "../../constants/muscleGroups";
import { getComplexMuscles } from "../../utils/complexMuscles";

import type { Exercise } from "../../types/exercise";

type ExercisePickerProps = {
    /** Id выбранных упражнений в порядке схемы. */
    value: string[];

    onChange: (ids: string[]) => void;

    /** Сообщение валидации — показывается под списком. */
    error?: string;

    /**
     * Прежний текст "Упражнение(я)" у комплекса, заведённого до связи с
     * базой упражнений: подсказка, из чего выбирать (показывается, пока
     * ничего не выбрано).
     */
    legacyText?: string;
};

/**
 * Выбор упражнений комплекса из базы упражнений: поле с поиском по
 * названию (русскому и английскому) и подсказками, ниже — выбранные
 * упражнения по порядку схемы, которые можно переставлять и убирать, и
 * общая мышечная группа выбранного.
 *
 * Само поле с подсказками — ExerciseSearchBox (общее с блоками программ).
 */
export default function ExercisePicker({
    value,
    onChange,
    error,
    legacyText,
}: ExercisePickerProps) {
    const { exercises } = useExercises();

    const byId = useMemo(
        () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
        [exercises]
    );

    const selected = value.map((id) => ({ id, exercise: byId.get(id) }));

    const muscles = useMemo(
        () =>
            getComplexMuscles(
                value
                    .map((id) => byId.get(id))
                    .filter((exercise): exercise is Exercise => exercise !== undefined)
            ),
        [value, byId]
    );

    function remove(id: string) {
        onChange(value.filter((item) => item !== id));
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;

        if (target < 0 || target >= value.length) {
            return;
        }

        const next = [...value];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    return (
        <div className="exercise-picker">
            <p className="exercise-picker__label">Упражнения комплекса</p>

            {
                selected.length === 0 && legacyText && (
                    <p className="exercise-picker__legacy">
                        Раньше здесь было записано текстом:{" "}
                        <em>{legacyText}</em>. Выберите соответствующие
                        упражнения из базы.
                    </p>
                )
            }

            {
                selected.length > 0 && (
                    <ol className="exercise-picker__selected">
                        {
                            selected.map(({ id, exercise }, index) => {
                                const title = exercise?.name ?? `Не найдено: ${id}`;

                                return (
                                    <li
                                        key={id}
                                        className={
                                            exercise
                                                ? "exercise-picker__item"
                                                : "exercise-picker__item exercise-picker__item--missing"
                                        }
                                    >
                                        <span className="exercise-picker__item-name">
                                            {title}
                                        </span>

                                        <span className="exercise-picker__item-actions">
                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button"
                                                aria-label={`Поднять выше: ${title}`}
                                                disabled={index === 0}
                                                onClick={() => move(index, -1)}
                                            >
                                                ↑
                                            </button>

                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button"
                                                aria-label={`Опустить ниже: ${title}`}
                                                disabled={index === selected.length - 1}
                                                onClick={() => move(index, 1)}
                                            >
                                                ↓
                                            </button>

                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button exercise-picker__icon-button--remove"
                                                aria-label={`Убрать из комплекса: ${title}`}
                                                onClick={() => remove(id)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    </li>
                                );
                            })
                        }
                    </ol>
                )
            }

            {
                selected.length === 0 && (
                    <p className="exercise-picker__hint">
                        Пока не выбрано ни одного упражнения.
                    </p>
                )
            }

            <ExerciseSearchBox
                excludedIds={value}
                onSelect={(exercise) => onChange([...value, exercise.id])}
                invalid={Boolean(error)}
            />

            <p className="exercise-picker__hint">
                Добавляйте упражнения в том порядке, в каком они идут в схеме:
                порядок можно поменять стрелками. Нужного нет в списке — сначала
                добавьте его в базу упражнений.
            </p>

            {
                (muscles.target.length > 0 || muscles.auxiliary.length > 0) && (
                    <div className="exercise-picker__muscles">
                        <p>
                            <strong>Целевые мышцы комплекса:</strong>{" "}
                            {muscles.target.map((key) => muscleGroupLabels[key]).join(", ") || "—"}
                        </p>

                        {
                            muscles.auxiliary.length > 0 && (
                                <p>
                                    <strong>Вспомогательные:</strong>{" "}
                                    {muscles.auxiliary.map((key) => muscleGroupLabels[key]).join(", ")}
                                </p>
                            )
                        }
                    </div>
                )
            }

            {
                error && (
                    <small className="exercise-picker__error" role="alert">
                        {error}
                    </small>
                )
            }
        </div>
    );
}
