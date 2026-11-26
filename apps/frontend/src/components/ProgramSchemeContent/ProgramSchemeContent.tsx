import { useMemo } from "react";
import { Link } from "react-router-dom";

import "../../styles/components/program-scheme-content.css";

import MuscleMap from "../MuscleMap/MuscleMap";
import MuscleMapLegend from "../MuscleMapLegend/MuscleMapLegend";

import type { ProgramScheme } from "../../types/program";

import { useExercises } from "../../context/ExerciseContext";
import { muscleGroupLabels } from "../../constants/muscleGroups";
import { movementTypeLabels } from "../../constants/movementTypes";
import { getComplexMuscles } from "../../utils/complexMuscles";
import { getSchemeExercises } from "../../utils/programExercises";
import {
    describeAutoBlock,
    formatTarget,
    hasSupersets,
    isAutoScheme,
} from "../../utils/programAuto";
import { formatWeight } from "../../utils/performedExercises";

type ProgramSchemeContentProps = {
    scheme: ProgramScheme;

    /** false — не показывать «Нагружаемые мышцы» (страница комплекса
     *  показывает их сама). */
    showMuscles?: boolean;
};

/**
 * Содержимое страницы схемы программы — оформлено так же, как страница
 * комплекса (pages/ComplexDetails): разделы с серым заголовком и белой
 * панелью. По порядку: описание, комплексы (блоки) с упражнениями в
 * порядке автора, «Нагружаемые мышцы», примечание, дополнительные
 * материалы. Название и теги схемы показывает сама страница
 * (pages/ProgramSchemeDetails). Только отображение — никакой
 * интерпретации того, что ввёл автор (п.18 документа).
 *
 * Упражнения из базы — ссылки на их страницы в новой вкладке (страница
 * схемы остаётся открытой); свои упражнения автора — обычный текст.
 */
export default function ProgramSchemeContent({
    scheme,
    showMuscles = true,
}: ProgramSchemeContentProps) {
    const { exercises, isLoading } = useExercises();

    const exerciseById = useMemo(
        () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
        [exercises]
    );

    // Мышцы схемы — объединение мышц её упражнений из базы (свои
    // упражнения текстом в расчёт не входят: у них нет данных о мышцах).
    const muscles = getComplexMuscles(getSchemeExercises(scheme, exercises));
    const hasMuscles = muscles.target.length > 0 || muscles.auxiliary.length > 0;

    // Автоматическая схема: вместо свободного текста («Схема», «Отдых»)
    // показываем то, что автор задал числами, — повторения/секунды у
    // упражнений, сколько раз повторять и отдых.
    const isAuto = isAutoScheme(scheme);

    return (
        <>
            {
                scheme.description && (
                    <section className="program-scheme-content__section">
                        <h2 className="program-scheme-content__section-title">
                            Описание
                        </h2>

                        <p className="program-scheme-content__panel program-scheme-content__text">
                            {scheme.description}
                        </p>
                    </section>
                )
            }

            {
                scheme.blocks.length === 0 && (
                    <p className="program-scheme-content__empty">
                        Автор пока не добавил в схему ни одного комплекса.
                    </p>
                )
            }

            {
                scheme.blocks.map((block, blockIndex) => {
                    const autoLines = isAuto ? describeAutoBlock(block) : [];
                    const showSets = isAuto && hasSupersets(block);
                    let setNumber = 0;

                    return (
                    <section
                        key={block.id}
                        className="program-scheme-content__section"
                    >
                        <h2 className="program-scheme-content__section-title">
                            {block.title || `Комплекс ${blockIndex + 1}`}
                        </h2>

                        <div className="program-scheme-content__panel">
                            {
                                block.items.length > 0 ? (
                                    <ol className="program-scheme-content__rows">
                                        {
                                            block.items.map((item, index) => {
                                                const exercise =
                                                    item.kind === "exercise"
                                                        ? exerciseById.get(item.exerciseId)
                                                        : undefined;

                                                const startsSet = index === 0 || !item.groupWithPrevious;

                                                if (startsSet) {
                                                    setNumber += 1;
                                                }

                                                const details = isAuto
                                                    ? [formatTarget(item.target), formatWeight(item.weightKg), item.load]
                                                          .filter(Boolean)
                                                          .join(" · ")
                                                    : item.load;

                                                return (
                                                    <li
                                                        key={index}
                                                        className="program-scheme-content__item"
                                                    >
                                                        {
                                                            showSets && startsSet && (
                                                                <p className="program-scheme-content__set-label">
                                                                    Сет {setNumber}
                                                                </p>
                                                            )
                                                        }

                                                        <div className="program-scheme-content__row">
                                                            <div className="program-scheme-content__number">
                                                                {String(index + 1).padStart(2, "0")}
                                                            </div>

                                                            <div className="program-scheme-content__body">
                                                                <p className="program-scheme-content__name">
                                                                    {
                                                                        item.kind === "text" ? (
                                                                            item.text
                                                                        ) : exercise ? (
                                                                            <>
                                                                                <Link
                                                                                    to={`/knowledge/exercises/${exercise.id}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="program-scheme-content__link"
                                                                                >
                                                                                    {exercise.name}
                                                                                </Link>

                                                                                <span className="program-scheme-content__exercise-type">
                                                                                    {movementTypeLabels[exercise.movementType]}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="program-scheme-content__note-inline">
                                                                                {isLoading ? "…" : "Упражнение недоступно"}
                                                                            </span>
                                                                        )
                                                                    }
                                                                </p>

                                                                {
                                                                    details && (
                                                                        <p className="program-scheme-content__description">
                                                                            {details}
                                                                        </p>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        }
                                    </ol>
                                ) : (
                                    <p className="program-scheme-content__note">
                                        В комплексе пока нет упражнений.
                                    </p>
                                )
                            }

                            {
                                isAuto ? (
                                    autoLines.map((line, lineIndex) => (
                                        <p
                                            key={line}
                                            className={
                                                lineIndex === 0
                                                    ? "program-scheme-content__block-scheme"
                                                    : "program-scheme-content__note"
                                            }
                                        >
                                            {line}
                                        </p>
                                    ))
                                ) : (
                                    block.scheme && (
                                        <p className="program-scheme-content__block-scheme">
                                            {block.scheme}
                                        </p>
                                    )
                                )
                            }

                            {
                                block.note && (
                                    <p className="program-scheme-content__note">
                                        Примечание: {block.note}
                                    </p>
                                )
                            }

                            {
                                !isAuto && block.rest && (
                                    <p className="program-scheme-content__note">
                                        Отдых: {block.rest}
                                    </p>
                                )
                            }
                        </div>
                    </section>
                    );
                })
            }

            {
                showMuscles && hasMuscles && (
                    <section className="program-scheme-content__section">
                        <h2 className="program-scheme-content__section-title">
                            Нагружаемые мышцы
                        </h2>

                        <div className="program-scheme-content__panel program-scheme-content__muscles">
                            <div className="program-scheme-content__map">
                                <MuscleMap
                                    targetMuscles={muscles.target}
                                    auxiliaryMuscles={muscles.auxiliary}
                                />
                            </div>

                            <div className="program-scheme-content__muscles-text">
                                <MuscleMapLegend
                                    items={
                                        muscles.auxiliary.length > 0
                                            ? ["target", "auxiliary"]
                                            : ["target"]
                                    }
                                />

                                <p>
                                    <strong>Целевые:</strong>{" "}
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

                                <p className="program-scheme-content__note">
                                    Складывается из мышц упражнений схемы, выбранных из базы.
                                </p>
                            </div>
                        </div>
                    </section>
                )
            }

            {
                scheme.note && (
                    <section className="program-scheme-content__section">
                        <h2 className="program-scheme-content__section-title">
                            Примечание
                        </h2>

                        <p className="program-scheme-content__panel program-scheme-content__text">
                            {scheme.note}
                        </p>
                    </section>
                )
            }

            {
                scheme.extraMaterials && (
                    <section className="program-scheme-content__section">
                        <h2 className="program-scheme-content__section-title">
                            Дополнительные материалы
                        </h2>

                        <p className="program-scheme-content__panel program-scheme-content__text">
                            {scheme.extraMaterials}
                        </p>
                    </section>
                )
            }
        </>
    );
}
