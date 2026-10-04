import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import MuscleMap from "../MuscleMap/MuscleMap";
import ViewSwitch from "../ViewSwitch/ViewSwitch";

import "../../styles/components/exercise-card.css";
import "../../styles/components/muscle-map-legend.css";

import type { Exercise } from "../../types/exercise";

import { movementTypeColors, movementTypeLabels } from "../../constants/movementTypes";
import { muscleGroupLabels } from "../../constants/muscleGroups";

type ExerciseCardProps = {
    exercise: Exercise;

    /** Выбрано ли упражнение — его мышцы подсвечены на карте. */
    selected?: boolean;

    /** Клик по карточке (не по кнопке "Подробнее") — выбор упражнения. */
    onSelect?: () => void;
};

type CardView = "photo" | "muscles";

const CARD_VIEW_OPTIONS = [
    { value: "photo", label: "Фото" },
    { value: "muscles", label: "Мышцы" },
] as const;

export default function ExerciseCard({
    exercise,
    selected = false,
    onSelect,
}: ExerciseCardProps) {
    const { id, name, movementType, targetMuscles, photoUrl } = exercise;

    // Адрес списка вместе с фильтрами — страница упражнения вернёт к нему.
    const location = useLocation();

    // Что показано в верхней части карточки. Переключатель есть только
    // у упражнений с фото; без фото всегда схема мышц. По умолчанию —
    // фото: по нему проще всего понять, что за упражнение.
    const [view, setView] = useState<CardView>("photo");

    const hasPhoto = Boolean(photoUrl);
    const activeView: CardView = hasPhoto ? view : "muscles";

    return (
        <Card
            id={`exercise-card-${id}`}
            className={
                "exercise-card" + (selected ? " exercise-card--selected" : "")
            }
            style={
                {
                    "--movement-color": movementTypeColors[movementType],
                } as React.CSSProperties
            }
            tabIndex={0}
            aria-current={selected ? "true" : undefined}
            onClick={() => onSelect?.()}
            onKeyDown={(event) => {
                // Enter/Пробел на самой карточке — выбор; на вложенной
                // ссылке — обычный переход.
                if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                ) {
                    event.preventDefault();
                    onSelect?.();
                }
            }}
        >
            <div className="exercise-card__photo-wrapper">
                {
                    activeView === "photo" && photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={`Выполнение упражнения: ${name}`}
                            className="exercise-card__photo"
                        />
                    ) : (
                        <div
                            className="exercise-card__photo exercise-card__photo--placeholder"
                            title="Красным отмечены целевые мышцы, оранжевым — вспомогательные"
                        >
                            <MuscleMap
                                compact
                                targetMuscles={exercise.targetMuscles}
                                auxiliaryMuscles={exercise.auxiliaryMuscles}
                            />
                        </div>
                    )
                }
            </div>

            {/*
              Строка под изображением одинаковой высоты у всех карточек —
              чтобы название и остальное содержимое выстраивались в ряд,
              независимо от того, есть у упражнения фото или нет.
              С фото здесь переключатель "Фото / Мышцы" (он не перекрывает
              изображение), без фото — пояснение цветов на схеме.
            */}
            {
                hasPhoto ? (
                    // Клики по строке не должны выбирать карточку (подсвечивать
                    // мышцы на общей карте), поэтому всплытие останавливаем.
                    <div
                        className="exercise-card__view-bar"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <ViewSwitch
                            options={CARD_VIEW_OPTIONS}
                            value={activeView}
                            onChange={setView}
                            ariaLabel="Что показывать на карточке"
                        />
                    </div>
                ) : (
                    <div className="exercise-card__view-bar">
                        <ul
                            className="exercise-card__legend"
                            aria-label="Обозначения на схеме мышц"
                        >
                            <li>
                                <span
                                    className="muscle-map-legend__swatch muscle-map-legend__swatch--target"
                                    aria-hidden="true"
                                />
                                Целевые
                            </li>

                            {
                                exercise.auxiliaryMuscles.length > 0 && (
                                    <li>
                                        <span
                                            className="muscle-map-legend__swatch muscle-map-legend__swatch--auxiliary"
                                            aria-hidden="true"
                                        />
                                        Вспомогательные
                                    </li>
                                )
                            }
                        </ul>
                    </div>
                )
            }

            <div className="exercise-card__body">
                <span className="exercise-card__type">
                    {movementTypeLabels[movementType]}
                </span>

                <h3 className="exercise-card__name">{name}</h3>

                <p className="exercise-card__muscles">
                    <span className="exercise-card__muscles-label">
                        Целевые мышцы:
                    </span>{" "}
                    {targetMuscles.map((muscle) => muscleGroupLabels[muscle]).join(", ")}
                </p>

                <Link
                    to={`/knowledge/exercises/${id}`}
                    state={{ listSearch: location.search }}
                    className="exercise-card__link"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Button variant="outline">Подробнее</Button>
                </Link>
            </div>
        </Card>
    );
}
