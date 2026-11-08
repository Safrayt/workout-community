import { Link } from "react-router-dom";

import "../../styles/components/exercise-related-list.css";

import type { Exercise } from "../../types/exercise";

import {
    movementTypeColors,
    movementTypeLabels,
} from "../../constants/movementTypes";
import { muscleGroupLabels } from "../../constants/muscleGroups";

type ExerciseRelatedListProps = {
    title: string;
    exercises: Exercise[];
};

/**
 * Раздел внизу страницы упражнения: менее сложные или более сложные
 * упражнения плитками-ссылками, каждое — в своей строке: квадратное
 * фото, название, тип движения и целевые мышцы. Пустой список не выводится — раздела на странице нет,
 * это решает вызывающая страница.
 */
export default function ExerciseRelatedList({
    title,
    exercises,
}: ExerciseRelatedListProps) {
    return (
        <section className="exercise-related">
            <h2 className="exercise-related__title">{title}</h2>

            <ul className="exercise-related__list">
                {
                    exercises.map((exercise) => (
                        <li key={exercise.id}>
                            <Link
                                to={`/knowledge/exercises/${exercise.id}`}
                                className="exercise-related__tile"
                            >
                                {
                                    exercise.photoUrl && (
                                        <img
                                            className="exercise-related__photo"
                                            src={exercise.photoUrl}
                                            alt=""
                                            loading="lazy"
                                        />
                                    )
                                }

                                <span className="exercise-related__info">
                                    <span className="exercise-related__name">
                                        {exercise.name}
                                    </span>

                                    <span className="exercise-related__type">
                                        <span
                                            className="exercise-related__dot"
                                            style={{
                                                backgroundColor:
                                                    movementTypeColors[exercise.movementType],
                                            }}
                                            aria-hidden="true"
                                        />

                                        {movementTypeLabels[exercise.movementType]}
                                    </span>

                                    {
                                        exercise.targetMuscles.length > 0 && (
                                            <span className="exercise-related__muscles">
                                                {
                                                    exercise.targetMuscles
                                                        .map((key) => muscleGroupLabels[key])
                                                        .join(", ")
                                                }
                                            </span>
                                        )
                                    }
                                </span>
                            </Link>
                        </li>
                    ))
                }
            </ul>
        </section>
    );
}
