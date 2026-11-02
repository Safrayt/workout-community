import "../../styles/components/exercise-filters.css";

import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";

import type { MovementType, MuscleGroupKey } from "../../types/exercise";
import type { Playground } from "../../types/playground";

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

    /** Выбранная площадка (по filters.playgroundId); пока не найдена — undefined. */
    selectedPlayground?: Playground;

    /**
     * Площадка есть в адресе, но такой нет (удалена или опечатка в
     * ссылке) — отбор по ней не применяется, об этом пишем в блоке.
     */
    isPlaygroundMissing?: boolean;
};

/**
 * Фильтры упражнений: тип движения, мышечные группы и площадка.
 * Кнопки мышц работают вместе с картой мышц — это один и тот же выбор,
 * а ещё единственный способ выбрать мышцу с клавиатуры. Блок
 * «Площадка» виден только когда площадка выбрана (на карте площадок
 * или ссылкой): в нём её название и кнопка «Снять выбор».
 */
export default function ExerciseFilters({
    filters,
    onChange,
    selectedPlayground,
    isPlaygroundMissing = false,
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
                filters.playgroundId !== "" && (
                    <div className="exercise-filters__group">
                        <h4 className="exercise-filters__title">Площадка</h4>

                        <p className="exercise-filters__hint">
                            Упражнения, которые можно выполнить на выбранной
                            площадке.
                        </p>

                        <div className="exercise-filters__playground">
                            {
                                selectedPlayground ? (
                                    <Link
                                        to={`/playgrounds/${selectedPlayground.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <strong>{selectedPlayground.name}</strong>
                                    </Link>
                                ) : isPlaygroundMissing ? (
                                    <span>
                                        Площадка не найдена — отбор по площадке
                                        не применяется.
                                    </span>
                                ) : null
                            }

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    onChange({ ...filters, playgroundId: "" })
                                }
                            >
                                Снять выбор
                            </Button>
                        </div>

                        {
                            selectedPlayground &&
                                selectedPlayground.equipment.length === 0 && (
                                    <p className="exercise-filters__hint">
                                        У площадки не указано оборудование,
                                        поэтому показаны только упражнения без
                                        оборудования и с вертикальным столбом.
                                    </p>
                                )
                        }
                    </div>
                )
            }

            {
                hasActiveExerciseFilters(filters) && (
                    <div className="exercise-filters__reset">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                // Строку поиска не трогаем: она вне
                                // панели фильтров и сбрасывается сама.
                                onChange({
                                    ...filters,
                                    movementTypes: [],
                                    muscles: [],
                                    playgroundId: "",
                                })
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
