import { Link } from "react-router-dom";

import "../../styles/components/complex-scheme-view.css";

import { useExercises } from "../../context/ExerciseContext";

import {
    buildSchemeMeta,
    describeItem,
    formatClock,
    formatRounds,
    formatSeconds,
    itemRanges,
    schemeTime,
} from "../../utils/complexScheme";

import type { MetricType } from "../../types/complex";
import type { SchemeBlock } from "../../types/complexScheme";

type ComplexSchemeViewProps = {
    scheme: SchemeBlock[];

    /** Пояснение к схеме целиком — внизу под общим временем. */
    note?: string;

    resultMetrics: MetricType[];

    /**
     * true — названия упражнений ссылками на страницы упражнений
     * (страница комплекса); false — просто текст (предпросмотр в форме).
     */
    linkExercises?: boolean;
};

function TimerIcon() {
    return (
        <svg
            className="scheme-view__timer-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M10 2h4" />
            <path d="M12 6v0" />
            <circle cx="12" cy="14" r="7.5" />
            <path d="M12 14V10" />
            <path d="M18.5 7.5l1.2-1.2" />
        </svg>
    );
}

/**
 * Схема комплекса: шаги по порядку с временем, итоги и пояснение.
 *
 * Выглядит так: строка итогов ("3 упражнения · 3 минуты · Максимум
 * повторений"), затем шаги — крупный номер (и интервал времени под ним,
 * когда он однозначен), название упражнения и подпись нагрузки, внизу —
 * "Общее время" и пояснение. Круговые схемы и суперсеты показываются
 * блоками с заголовком "11 кругов" / "Суперсет 1 · 3 подхода".
 */
export default function ComplexSchemeView({
    scheme,
    note,
    resultMetrics,
    linkExercises = true,
}: ComplexSchemeViewProps) {
    const { getExerciseById, isLoading } = useExercises();

    const meta = buildSchemeMeta(scheme, resultMetrics);
    const ranges = itemRanges(scheme);
    const total = schemeTime(scheme);

    const hasFooter = total !== null || Boolean(note?.trim());

    return (
        <section className="scheme-view" aria-label="Схема комплекса">
            <p className="scheme-view__meta">{meta.join(" · ")}</p>

            {
                scheme.map((block, blockIndex) => {
                    const rounds = formatRounds(block);
                    const showHeader =
                        scheme.length > 1 || Boolean(block.title) || block.rounds !== 1;

                    const rests = [
                        block.restBetweenItemsSeconds
                            ? `между упражнениями — ${formatSeconds(block.restBetweenItemsSeconds)}`
                            : null,
                        block.restBetweenRoundsSeconds && block.rounds !== 1
                            ? `между ${block.roundsKind === "sets" ? "подходами" : "кругами"} — ${formatSeconds(block.restBetweenRoundsSeconds)}`
                            : null,
                    ].filter(Boolean);

                    return (
                        <div className="scheme-view__block" key={blockIndex}>
                            {
                                showHeader && (
                                    <div className="scheme-view__block-header">
                                        {
                                            // Единственному безымянному блоку заголовок "Блок 1"
                                            // ни к чему: достаточно плашки "11 кругов".
                                            (block.title || scheme.length > 1) && (
                                                <h3 className="scheme-view__block-title">
                                                    {block.title || `Блок ${blockIndex + 1}`}
                                                </h3>
                                            )
                                        }

                                        {
                                            rounds && block.rounds !== 1 && (
                                                <span className="scheme-view__chip">
                                                    {rounds}
                                                </span>
                                            )
                                        }

                                        {
                                            block.rounds === null && block.timeLimitSeconds !== null && (
                                                <span className="scheme-view__chip">
                                                    Максимум {block.roundsKind === "sets" ? "подходов" : "кругов"} за{" "}
                                                    {formatSeconds(block.timeLimitSeconds)}
                                                </span>
                                            )
                                        }

                                        {
                                            block.rounds !== null && block.timeLimitSeconds !== null && (
                                                <span className="scheme-view__chip">
                                                    Лимит {formatSeconds(block.timeLimitSeconds)}
                                                </span>
                                            )
                                        }

                                        {
                                            rests.length > 0 && (
                                                <span className="scheme-view__block-rest">
                                                    Отдых: {rests.join(", ")}
                                                </span>
                                            )
                                        }
                                    </div>
                                )
                            }

                            <ol className="scheme-view__rows">
                                {
                                    block.items.map((item, itemIndex) => {
                                        const exercise = getExerciseById(item.exerciseId);
                                        const range = ranges[blockIndex]?.[itemIndex];
                                        const description = describeItem(item, block);
                                        const name =
                                            exercise?.name ??
                                            (isLoading ? "Загрузка…" : "Упражнение не найдено");

                                        return (
                                            <li key={itemIndex} className="scheme-view__item">
                                                {
                                                    itemIndex > 0 && Boolean(block.restBetweenItemsSeconds) && (
                                                        <p className="scheme-view__rest">
                                                            Отдых {formatSeconds(block.restBetweenItemsSeconds ?? 0)}
                                                        </p>
                                                    )
                                                }

                                                <div className="scheme-view__row">
                                                    <div className="scheme-view__number">
                                                        <span className="scheme-view__number-value">
                                                            {String(itemIndex + 1).padStart(2, "0")}
                                                        </span>

                                                        {
                                                            range && (
                                                                <span className="scheme-view__range">
                                                                    {formatClock(range.start)}–{formatClock(range.end)}
                                                                </span>
                                                            )
                                                        }
                                                    </div>

                                                    <div className="scheme-view__body">
                                                        <p className="scheme-view__name">
                                                            {
                                                                linkExercises && exercise ? (
                                                                    <Link
                                                                        to={`/knowledge/exercises/${exercise.id}`}
                                                                        className="scheme-view__link"
                                                                        title="Открыть описание упражнения (в новой вкладке)"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                ) : (
                                                                    name
                                                                )
                                                            }
                                                        </p>

                                                        {
                                                            description && (
                                                                <p className="scheme-view__description">
                                                                    {description}
                                                                </p>
                                                            )
                                                        }

                                                        {
                                                            item.note && (
                                                                <p className="scheme-view__item-note">
                                                                    {item.note}
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
                        </div>
                    );
                })
            }

            {
                hasFooter && (
                    <div className="scheme-view__footer">
                        {
                            total && (
                                <p className="scheme-view__total">
                                    <TimerIcon />
                                    <strong>
                                        {
                                            total.exact
                                                ? `Общее время — ровно ${formatSeconds(total.seconds)}`
                                                : `Лимит времени — ${formatSeconds(total.seconds)}`
                                        }
                                    </strong>
                                </p>
                            )
                        }

                        {
                            note?.trim() && (
                                <p className="scheme-view__note">{note.trim()}</p>
                            )
                        }
                    </div>
                )
            }
        </section>
    );
}
