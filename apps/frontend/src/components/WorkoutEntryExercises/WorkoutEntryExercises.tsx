import { Link } from "react-router-dom";

import "../../styles/components/workout-entry-exercises.css";

import type { PerformedExercise } from "../../types/performedExercise";
import { formatSets, formatWeight } from "../../utils/performedExercises";

type WorkoutEntryExercisesProps = {
    exercises: PerformedExercise[] | undefined;
};

/**
 * Выполненные упражнения записи с результатом каждого подхода
 * («5 · 4 · 2 повт.»). Упражнения из базы ведут на свою страницу.
 * Нет упражнений — блока нет: запись может быть только текстом.
 */
export default function WorkoutEntryExercises({
    exercises,
}: WorkoutEntryExercisesProps) {
    if (!exercises || exercises.length === 0) {
        return null;
    }

    return (
        <div className="workout-entry-exercises">
            <h3 className="workout-entry-exercises__title">
                Схема тренировки
            </h3>

            <ul className="workout-entry-exercises__list">
                {exercises.map((exercise, index) => (
                    <li
                        key={`${exercise.exerciseId ?? exercise.name}-${index}`}
                        className="workout-entry-exercises__item"
                    >
                        {exercise.exerciseId ? (
                            <Link
                                to={`/knowledge/exercises/${exercise.exerciseId}`}
                                className="workout-entry-exercises__name"
                            >
                                {exercise.name}
                            </Link>
                        ) : (
                            <span className="workout-entry-exercises__name">
                                {exercise.name}
                            </span>
                        )}

                        <span className="workout-entry-exercises__sets">
                            {formatSets(exercise.sets, exercise.unit)}

                            {exercise.weightKg
                                ? ` · ${formatWeight(exercise.weightKg)}`
                                : ""}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
