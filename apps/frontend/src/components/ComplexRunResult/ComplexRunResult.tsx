import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";
import Input from "../ui/Input/Input";

import DurationInput from "../DurationInput/DurationInput";

import { appendToWorkoutEntryDescription } from "../../api/diary";
import { useComplexes } from "../../context/ComplexContext";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useWorkoutDiary } from "../../context/WorkoutDiaryContext";
import { metricLabels } from "../../constants/complexTypes";
import type { Complex } from "../../types/complex";
import {
    formatRunDuration,
    pickManualFields,
    validateManualResult,
    type ManualResultFields,
    type RunResultFields,
} from "../../utils/complexRunResult";
import { getTodayDateString } from "../../utils/today";

type ComplexRunResultProps = {
    complexDef: Complex;

    /** Что помощник вносит в результат сам (время и повторения). */
    fields: RunResultFields;

    /** Остальные показатели комплекса — человек вводит их сам. Значения
     *  хранит RunScreen: они нужны и при создании новой записи. */
    manual: ManualResultFields;
    onManualChange: (manual: ManualResultFields) => void;

    /** Что не заполнено (показывается над кнопками). */
    error: string | null;
    onErrorChange: (error: string | null) => void;

    /** Текст итога тренировки — его можно дописать в запись. */
    description: string;
};

/**
 * Результат комплекса на экране завершения помощника: что будет внесено
 * в таблицу результатов и к какой записи дневника оно добавится.
 *
 * Время и повторения помощник считает сам (по показателям комплекса),
 * остальные показатели вводятся здесь же. Выполнение комплекса
 * привязывается к записи всегда — даже если вносить в него нечего, иначе
 * запись не будет «подтверждать» комплекс:
 *  — есть запись за сегодня: выполнение добавляется к выбранной записи.
 *    Это ещё одна строка в истории: прежние выполнения записи и её
 *    описание не меняются (описание дополняется только по галочке);
 *  — записи нет или нужна новая: кнопка «Сделать запись в дневнике»
 *    (RunScreen) — выполнение создастся само, когда запись сохранится.
 */
export default function ComplexRunResult({
    complexDef,
    fields,
    manual,
    onManualChange,
    error,
    onErrorChange,
    description,
}: ComplexRunResultProps) {
    const { entries, refreshEntry } = useWorkoutDiary();
    const { currentUser } = useCurrentUser();
    const { addCompletion } = useComplexes();

    const today = getTodayDateString();

    const todayEntries = useMemo(
        () =>
            entries
                .filter(
                    (entry) =>
                        entry.userId === currentUser.id && entry.date === today
                )
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        [entries, currentUser.id, today]
    );

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [appendText, setAppendText] = useState(false);
    const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [savedTitle, setSavedTitle] = useState("");
    const [descriptionFailed, setDescriptionFailed] = useState(false);

    const metrics = complexDef.resultMetrics;
    const usesMetric = (metric: (typeof metrics)[number]) =>
        metrics.includes(metric);

    const selected =
        todayEntries.find((entry) => entry.id === selectedId) ??
        todayEntries[0];

    function setNumber(
        key: "resultSets" | "resultRounds" | "resultCount",
        value: string
    ) {
        onErrorChange(null);
        onManualChange({
            ...manual,
            [key]: value === "" ? undefined : Number(value),
        });
    }

    async function handleAdd() {
        if (!selected || status !== "idle") {
            return;
        }

        const problem = validateManualResult(metrics, manual);

        if (problem) {
            onErrorChange(problem);
            return;
        }

        onErrorChange(null);
        setDescriptionFailed(false);
        setStatus("saving");

        try {
            await addCompletion(complexDef.id, {
                complexId: complexDef.id,
                ...fields,
                ...pickManualFields(metrics, manual),
                diaryEntryId: selected.id,
                // Дата выполнения должна совпадать с датой записи.
                completedDate: selected.date,
                viaAssistant: true,
            });
        } catch (err: unknown) {
            console.error("Не удалось добавить результат комплекса:", err);
            onErrorChange(
                err instanceof Error && err.message
                    ? err.message
                    : "Не удалось добавить результат. Попробуйте ещё раз."
            );
            setStatus("idle");
            return;
        }

        if (appendText) {
            try {
                await appendToWorkoutEntryDescription(selected.id, description);
                await refreshEntry(selected.id);
            } catch (err: unknown) {
                // Результат уже добавлен — описание дополнить не вышло.
                console.error("Не удалось дополнить описание записи:", err);
                setDescriptionFailed(true);
            }
        }

        setSavedTitle(selected.title);
        setStatus("saved");
    }

    const isSaved = status === "saved";

    return (
        <div className="program-scheme-run__save">
            <h2 className="program-scheme-run__subtitle">
                Результат комплекса
            </h2>

            <ul className="program-scheme-run__facts">
                {
                    fields.resultTimeSeconds !== undefined && (
                        <li>
                            Общее время:{" "}
                            <strong>
                                {formatRunDuration(fields.resultTimeSeconds)}
                            </strong>
                        </li>
                    )
                }

                {
                    fields.resultReps !== undefined && (
                        <li>
                            Всего повторений:{" "}
                            <strong>{fields.resultReps}</strong>
                        </li>
                    )
                }
            </ul>

            {
                !isSaved && (
                    <>
                        {
                            usesMetric("duration") && (
                                <DurationInput
                                    idPrefix="run-result-duration"
                                    label={metricLabels.duration}
                                    valueSeconds={manual.resultDurationSeconds}
                                    onChange={(seconds) => {
                                        onErrorChange(null);
                                        onManualChange({
                                            ...manual,
                                            resultDurationSeconds: seconds,
                                        });
                                    }}
                                />
                            )
                        }

                        {
                            usesMetric("sets") && (
                                <Input
                                    id="run-result-sets"
                                    label={metricLabels.sets}
                                    type="number"
                                    min={0}
                                    value={manual.resultSets ?? ""}
                                    onChange={(event) =>
                                        setNumber("resultSets", event.target.value)
                                    }
                                />
                            )
                        }

                        {
                            usesMetric("rounds") && (
                                <Input
                                    id="run-result-rounds"
                                    label={metricLabels.rounds}
                                    type="number"
                                    min={0}
                                    value={manual.resultRounds ?? ""}
                                    onChange={(event) =>
                                        setNumber("resultRounds", event.target.value)
                                    }
                                />
                            )
                        }

                        {
                            usesMetric("count") && (
                                <Input
                                    id="run-result-count"
                                    label={metricLabels.count}
                                    type="number"
                                    min={0}
                                    value={manual.resultCount ?? ""}
                                    onChange={(event) =>
                                        setNumber("resultCount", event.target.value)
                                    }
                                />
                            )
                        }
                    </>
                )
            }

            {
                isSaved ? (
                    <>
                        <p className="program-scheme-run__saved">
                            Результат добавлен к записи «{savedTitle}».{" "}
                            <Link to={`/complexes/${complexDef.id}`}>
                                Открыть комплекс
                            </Link>
                        </p>

                        {
                            descriptionFailed && (
                                <p className="auth-form__error" role="alert">
                                    Описание записи дополнить не удалось — запись
                                    осталась без изменений.
                                </p>
                            )
                        }
                    </>
                ) : (
                    <>
                        {
                            error && (
                                <p className="auth-form__error" role="alert">
                                    {error}
                                </p>
                            )
                        }

                        {
                            todayEntries.length > 0 ? (
                                <>
                                    <p className="program-scheme-run__hint">
                                        Добавьте результат к записи за сегодня
                                        или создайте новую запись кнопкой
                                        ниже — результат добавится к ней сам.
                                    </p>

                                    <div
                                        className="program-scheme-run__entry-list"
                                        role="radiogroup"
                                        aria-label="Запись дневника за сегодня"
                                    >
                                        {
                                            todayEntries.map((entry) => (
                                                <label
                                                    key={entry.id}
                                                    className="program-scheme-run__entry-option"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="complex-result-entry"
                                                        checked={selected?.id === entry.id}
                                                        onChange={() => setSelectedId(entry.id)}
                                                    />
                                                    <span>{entry.title}</span>
                                                </label>
                                            ))
                                        }
                                    </div>

                                    <label className="program-scheme-run__entry-option">
                                        <input
                                            type="checkbox"
                                            checked={appendText}
                                            onChange={(event) =>
                                                setAppendText(event.target.checked)
                                            }
                                        />
                                        <span>
                                            Дописать итог тренировки в описание
                                            записи (в конец, прежний текст не
                                            меняется)
                                        </span>
                                    </label>

                                    <Button
                                        className="program-scheme-run__big-button"
                                        variant="secondary"
                                        onClick={handleAdd}
                                        disabled={status === "saving"}
                                    >
                                        {
                                            status === "saving"
                                                ? "Добавляем…"
                                                : "Добавить результат к выбранной записи"
                                        }
                                    </Button>
                                </>
                            ) : (
                                <p className="program-scheme-run__hint">
                                    Записей за сегодня нет. Создайте запись
                                    кнопкой ниже — результат комплекса
                                    добавится к ней сам.
                                </p>
                            )
                        }
                    </>
                )
            }
        </div>
    );
}
