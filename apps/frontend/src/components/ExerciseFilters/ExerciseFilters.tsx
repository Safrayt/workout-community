import "../../styles/components/exercise-filters.css";

import Button from "../ui/Button/Button";

import type { MovementType, MuscleGroupKey } from "../../types/exercise";

import { movementTypes } from "../../constants/movementTypes";
import { muscleGroups } from "../../constants/muscleGroups";

import {
    hasActiveExerciseFilters,
    toggleItem,
    type ExerciseFilterState,
} from "../../utils/exerciseFilters";

type ExerciseFiltersProps = {
    filters: ExerciseFilterState;
    onChange: (filters: ExerciseFilterState) => void;
};

/**
 * Фильтры упражнений: тип движения и мышечные группы. Кнопки мышц
 * работают вместе с картой — это один и тот же выбор, а ещё
 * единственный способ выбрать мышцу с клавиатуры.
 */
export default function ExerciseFilters({
    filters,
    onChange,
}: ExerciseFiltersProps) {
    function toggleMovementType(type: MovementType) {
        onChange({
            ...filters,
            movementTypes: toggleItem(filters.movementTypes, type),
        });
    }

    function toggleMuscle(muscle: MuscleGroupKey) {
        onChange({
            ...filters,
            muscles: toggleItem(filters.muscles, muscle),
        });
    }

    return (
        <div className="exercise-filters">
            <div className="exercise-filters__group">
                <h4 className="exercise-filters__title">Тип движения</h4>

                <div className="exercise-filters__chips">
                    {
                        movementTypes.map((type) => {
                            const isActive = filters.movementTypes.includes(
                                type.key
                            );

                            return (
                                <button
                                    key={type.key}
                                    type="button"
                                    className={
                                        "filter-chip filter-chip--movement" +
                                        (isActive ? " filter-chip--active" : "")
                                    }
                                    style={
                                        {
                                            "--chip-color": type.color,
                                        } as React.CSSProperties
                                    }
                                    aria-pressed={isActive}
                                    onClick={() => toggleMovementType(type.key)}
                                >
                                    <span
                                        className="filter-chip__dot"
                                        aria-hidden="true"
                                    />

                                    {type.label}
                                </button>
                            );
                        })
                    }
                </div>
            </div>

            <div className="exercise-filters__group">
                <h4 className="exercise-filters__title">Мышечные группы</h4>

                <p className="exercise-filters__hint">
                    Можно выбрать несколько: останутся упражнения, которые
                    нагружают все выбранные мышцы сразу.
                </p>

                <div className="exercise-filters__chips">
                    {
                        muscleGroups.map((group) => {
                            const isActive = filters.muscles.includes(
                                group.key
                            );

                            return (
                                <button
                                    key={group.key}
                                    type="button"
                                    className={
                                        "filter-chip" +
                                        (isActive ? " filter-chip--active" : "")
                                    }
                                    title={group.fullName}
                                    aria-pressed={isActive}
                                    onClick={() => toggleMuscle(group.key)}
                                >
                                    {group.label}
                                </button>
                            );
                        })
                    }
                </div>
            </div>

            {
                hasActiveExerciseFilters(filters) && (
                    <div className="exercise-filters__reset">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                onChange({ movementTypes: [], muscles: [] })
                            }
                        >
                            Сбросить фильтры
                        </Button>
                    </div>
                )
            }
        </div>
    );
}
