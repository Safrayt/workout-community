import { useState } from "react";

import "../../styles/components/muscle-map.css";

import type { MuscleGroupKey } from "../../types/exercise";

import { muscleGroups } from "../../constants/muscleGroups";
import {
    MUSCLE_MAP_BACK_CENTER_X,
    MUSCLE_MAP_FRONT_CENTER_X,
    MUSCLE_MAP_VIEW_BOX,
    muscleMapShapes,
} from "../../constants/muscleMapShapes";

type MuscleMapProps = {
    /** Мышцы, выбранные в фильтре (зелёная заливка и обводка). */
    selectedMuscles?: MuscleGroupKey[];

    /** Целевые мышцы упражнения (красная заливка). */
    targetMuscles?: MuscleGroupKey[];

    /** Вспомогательные мышцы упражнения (оранжевая заливка). */
    auxiliaryMuscles?: MuscleGroupKey[];

    /**
     * Клик по мышце. Если не передан, карта только показывает
     * подсветку (карточка упражнения, страница упражнения).
     */
    onToggleMuscle?: (muscle: MuscleGroupKey) => void;

    /**
     * Компактный вид: без подписей "Спереди/Сзади" и без названия
     * мышцы под силуэтом — для миниатюры на карточке.
     */
    compact?: boolean;
};

const LABEL_AREA_HEIGHT = 14;

/**
 * Силуэт человека спереди и сзади, разбитый на мышечные группы.
 *
 * Мышца целиком (обе проекции) подсвечивается при наведении, выбирается
 * кликом и показывает свою роль в упражнении цветом. Выбор мышц
 * доступен и кнопками фильтра рядом с картой — для клавиатуры и экранных
 * читалок, поэтому сами фигуры в порядок Tab не включены.
 */
export default function MuscleMap({
    selectedMuscles = [],
    targetMuscles = [],
    auxiliaryMuscles = [],
    onToggleMuscle,
    compact = false,
}: MuscleMapProps) {
    const [hoveredMuscle, setHoveredMuscle] =
        useState<MuscleGroupKey | null>(null);

    const isInteractive = onToggleMuscle !== undefined && !compact;

    const { x, y, width, height } = MUSCLE_MAP_VIEW_BOX;
    const viewBoxHeight = compact ? height : height + LABEL_AREA_HEIGHT;

    const hoveredInfo = muscleGroups.find(
        (group) => group.key === hoveredMuscle
    );

    return (
        <div className="muscle-map-wrapper">
            <svg
                className={
                    "muscle-map" +
                    (isInteractive ? " muscle-map--interactive" : "")
                }
                viewBox={`${x} ${y} ${width} ${viewBoxHeight}`}
                role="img"
                aria-label="Силуэт человека с мышечными группами, вид спереди и сзади"
            >
                {
                    muscleGroups.map(({ key, label, fullName }) => {
                        const classNames = ["muscle-map__muscle"];

                        if (selectedMuscles.includes(key)) {
                            classNames.push("muscle-map__muscle--selected");
                        }

                        if (auxiliaryMuscles.includes(key)) {
                            classNames.push("muscle-map__muscle--auxiliary");
                        }

                        // Цель важнее вспомогательной роли, если мышца
                        // по ошибке указана в обоих списках.
                        if (targetMuscles.includes(key)) {
                            classNames.push("muscle-map__muscle--target");
                        }

                        return (
                            <g
                                key={key}
                                className={classNames.join(" ")}
                                onClick={
                                    isInteractive
                                        ? () => onToggleMuscle(key)
                                        : undefined
                                }
                                onMouseEnter={
                                    isInteractive
                                        ? () => setHoveredMuscle(key)
                                        : undefined
                                }
                                onMouseLeave={
                                    isInteractive
                                        ? () => setHoveredMuscle(null)
                                        : undefined
                                }
                            >
                                <title>{fullName ?? label}</title>

                                {
                                    muscleMapShapes[key].map((d, index) => (
                                        <path key={index} d={d} />
                                    ))
                                }
                            </g>
                        );
                    })
                }

                {
                    !compact && (
                        <>
                            <text
                                className="muscle-map__view-label"
                                x={MUSCLE_MAP_FRONT_CENTER_X}
                                y={y + height + 9}
                                textAnchor="middle"
                            >
                                Спереди
                            </text>

                            <text
                                className="muscle-map__view-label"
                                x={MUSCLE_MAP_BACK_CENTER_X}
                                y={y + height + 9}
                                textAnchor="middle"
                            >
                                Сзади
                            </text>
                        </>
                    )
                }
            </svg>

            {
                isInteractive && (
                    <p className="muscle-map__caption" aria-live="polite">
                        {
                            hoveredInfo
                                ? (hoveredInfo.fullName ?? hoveredInfo.label)
                                : "Нажмите на мышцу, чтобы выбрать её"
                        }
                    </p>
                )
            }
        </div>
    );
}
