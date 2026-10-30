import "../../styles/components/exercise-filters.css";
import "../../styles/components/complex-movement-filter.css";

import type { MovementType } from "../../types/complex";

import { movementTypes } from "../../constants/movementTypes";

type ComplexMovementFilterProps = {
    selectedTypes: MovementType[];

    onChange: (types: MovementType[]) => void;
};

/**
 * Фильтр комплексов по типу движения — цветные кнопки с теми же
 * цветами и подписями, что в фильтре упражнений (кнопки заодно служат
 * легендой цветов). Тип комплекса — это типы движения его упражнений,
 * поэтому у комплекса их может быть несколько, и несколько выбранных
 * кнопок работают по И — как и фильтр «Тип»: остаются комплексы, в
 * которых есть КАЖДЫЙ из выбранных типов (см. pages/Complexes/Complexes.tsx).
 */
export default function ComplexMovementFilter({
    selectedTypes,
    onChange,
}: ComplexMovementFilterProps) {
    function toggleType(type: MovementType) {
        onChange(
            selectedTypes.includes(type)
                ? selectedTypes.filter((item) => item !== type)
                : [...selectedTypes, type]
        );
    }

    return (
        <div className="complex-movement-filter">
            <h4 className="exercise-filters__title">Тип движения</h4>

            <div className="exercise-filters__chips">
                {
                    movementTypes.map((type) => {
                        const isActive = selectedTypes.includes(type.key);

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
                                onClick={() => toggleType(type.key)}
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
    );
}
