import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";
import Input from "../ui/Input/Input";

import ComplexStars from "../ComplexStars/ComplexStars";
import DiaryEntryPicker from "../DiaryEntryPicker/DiaryEntryPicker";
import DurationInput from "../DurationInput/DurationInput";

import "../../styles/components/complex-completion-form.css";

import type { Complex, MetricType } from "../../types/complex";
import type { WorkoutEntry } from "../../types/workoutEntry";
import type { NewComplexCompletion } from "../../types/newComplexCompletion";

import { metricLabels } from "../../constants/complexTypes";
import { calculatePreviewStars } from "../../utils/complexResult";
import { formatDate } from "../../utils/formatDate";
import { getTodayDateString } from "../../utils/today";

type ComplexCompletionFormProps = {

    complexDef: Complex;

    /** Записи дневника текущего пользователя — для шага выбора подтверждения. */
    diaryEntries: WorkoutEntry[];

    /** Начальные значения — для редактирования существующего выполнения. */
    initialValue?: Partial<NewComplexCompletion>;

    submitLabel?: string;

    onSubmit: (data: NewComplexCompletion) => Promise<void> | void;

    onCancel: () => void;

};

export default function ComplexCompletionForm({
    complexDef,
    diaryEntries,
    initialValue,
    submitLabel = "Подтвердить выполнение",
    onSubmit,
    onCancel,
}: ComplexCompletionFormProps) {
    const [resultTimeSeconds, setResultTimeSeconds] = useState<number | undefined>(
        initialValue?.resultTimeSeconds
    );
    const [resultDurationSeconds, setResultDurationSeconds] = useState<
        number | undefined
    >(initialValue?.resultDurationSeconds);
    const [reps, setReps] = useState(
        initialValue?.resultReps !== undefined ? String(initialValue.resultReps) : ""
    );
    const [sets, setSets] = useState(
        initialValue?.resultSets !== undefined ? String(initialValue.resultSets) : ""
    );
    const [rounds, setRounds] = useState(
        initialValue?.resultRounds !== undefined ? String(initialValue.resultRounds) : ""
    );
    const [count, setCount] = useState(
        initialValue?.resultCount !== undefined ? String(initialValue.resultCount) : ""
    );

    const [completedDate, setCompletedDate] = useState(
        initialValue?.completedDate ?? getTodayDateString()
    );
    const [diaryEntryId, setDiaryEntryId] = useState<string | undefined>(
        initialValue?.diaryEntryId
    );

    const [step, setStep] = useState<"result" | "diary" | "confirm">("result");
    const [error, setError] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const usesMetric = (metric: MetricType) =>
        complexDef.resultMetrics.includes(metric);

    // Комплекс должен быть привязан к конкретной тренировке — поэтому
    // на выбор доступны только записи дневника той же даты, что и дата
    // выполнения. Если дата меняется и ранее выбранная запись ей больше
    // не соответствует, выбор сбрасывается.
    const entriesForDate = useMemo(
        () => diaryEntries.filter((entry) => entry.date === completedDate),
        [diaryEntries, completedDate]
    );

    function handleDateChange(newDate: string) {
        setCompletedDate(newDate);

        const stillValid = diaryEntries.some(
            (entry) => entry.id === diaryEntryId && entry.date === newDate
        );

        if (!stillValid) {
            setDiaryEntryId(undefined);
        }
    }

    function collectData(): NewComplexCompletion {
        return {
            complexId: complexDef.id,
            resultTimeSeconds: usesMetric("time") ? resultTimeSeconds : undefined,
            resultDurationSeconds: usesMetric("duration")
                ? resultDurationSeconds
                : undefined,
            resultReps: usesMetric("reps") && reps !== "" ? Number(reps) : undefined,
            resultSets: usesMetric("sets") && sets !== "" ? Number(sets) : undefined,
            resultRounds:
                usesMetric("rounds") && rounds !== "" ? Number(rounds) : undefined,
            resultCount: usesMetric("count") && count !== "" ? Number(count) : undefined,
            diaryEntryId,
            completedDate,
        };
    }

    const previewData = useMemo(collectData, [
        resultTimeSeconds,
        resultDurationSeconds,
        reps,
        sets,
        rounds,
        count,
        diaryEntryId,
        completedDate,
    ]);

    const previewStars = calculatePreviewStars(complexDef, previewData);

    function validateResultStep(): string | undefined {
        if (usesMetric("time") && resultTimeSeconds === undefined) {
            return "Укажите время выполнения.";
        }
        if (usesMetric("duration") && resultDurationSeconds === undefined) {
            return "Укажите продолжительность выполнения.";
        }

        return undefined;
    }

    function handleNextFromResult() {
        const validationError = validateResultStep();

        if (validationError) {
            setError(validationError);
            return;
        }

        setError(undefined);
        setStep("diary");
    }

    async function handleConfirm() {
        if (!diaryEntryId) {
            setError(
                "Нужно выбрать запись дневника — комплекс не может быть подтверждён без неё."
            );
            setStep("diary");
            return;
        }

        setIsSubmitting(true);
        setError(undefined);

        try {
            await onSubmit(collectData());
        } catch (submitError: unknown) {
            console.error("Не удалось сохранить выполнение комплекса:", submitError);
            setError("Не удалось сохранить выполнение. Попробуйте ещё раз.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const selectedDiaryEntry = diaryEntries.find((entry) => entry.id === diaryEntryId);

    return (
        <div className="complex-completion-form">
            {
                step === "result" && (
                    <>
                        <h3 className="complex-completion-form__title">{complexDef.name}</h3>

                        {/* Только поля, нужные для расчёта результата этого комплекса (п.16) */}
                        {
                            usesMetric("time") && (
                                <DurationInput
                                    idPrefix="completion-time"
                                    label={metricLabels.time}
                                    valueSeconds={resultTimeSeconds}
                                    onChange={setResultTimeSeconds}
                                />
                            )
                        }

                        {
                            usesMetric("duration") && (
                                <DurationInput
                                    idPrefix="completion-duration"
                                    label={metricLabels.duration}
                                    valueSeconds={resultDurationSeconds}
                                    onChange={setResultDurationSeconds}
                                />
                            )
                        }

                        {
                            usesMetric("reps") && (
                                <Input
                                    id="completion-reps"
                                    label={metricLabels.reps}
                                    type="number"
                                    min={0}
                                    value={reps}
                                    onChange={(event) => setReps(event.target.value)}
                                />
                            )
                        }

                        {
                            usesMetric("sets") && (
                                <Input
                                    id="completion-sets"
                                    label={metricLabels.sets}
                                    type="number"
                                    min={0}
                                    value={sets}
                                    onChange={(event) => setSets(event.target.value)}
                                />
                            )
                        }

                        {
                            usesMetric("rounds") && (
                                <Input
                                    id="completion-rounds"
                                    label={metricLabels.rounds}
                                    type="number"
                                    min={0}
                                    value={rounds}
                                    onChange={(event) => setRounds(event.target.value)}
                                />
                            )
                        }

                        {
                            usesMetric("count") && (
                                <Input
                                    id="completion-count"
                                    label={metricLabels.count}
                                    type="number"
                                    min={0}
                                    value={count}
                                    onChange={(event) => setCount(event.target.value)}
                                />
                            )
                        }

                        <Input
                            id="completion-date"
                            label="Дата выполнения"
                            type="date"
                            max={getTodayDateString()}
                            value={completedDate}
                            onChange={(event) => handleDateChange(event.target.value)}
                        />

                        {
                            error && (
                                <p className="complex-completion-form__error">{error}</p>
                            )
                        }

                        <div className="complex-completion-form__actions">
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Отмена
                            </Button>

                            <Button type="button" onClick={handleNextFromResult}>
                                Далее
                            </Button>
                        </div>
                    </>
                )
            }

            {
                step === "diary" && (
                    <>
                        <h3 className="complex-completion-form__title">
                            Запись дневника
                        </h3>

                        <p className="complex-completion-form__hint">
                            Комплекс подтверждается записью дневника за{" "}
                            {formatDate(completedDate)}. Если нужна другая дата,{" "}
                            <button
                                type="button"
                                className="complex-completion-form__link-button"
                                onClick={() => setStep("result")}
                            >
                                измени её
                            </button>
                            .
                        </p>

                        {
                            entriesForDate.length === 0 ? (
                                <div className="complex-completion-form__no-entries">
                                    <p>
                                        На {formatDate(completedDate)} нет ни одной записи
                                        дневника.
                                    </p>
                                    <p>
                                        Комплекс можно отметить только вместе с записью
                                        тренировки в дневнике — сначала добавь её, а потом
                                        вернись сюда.
                                    </p>
                                    <Link
                                        to="/diary/create/workout"
                                        className="complex-completion-form__add-entry-link"
                                    >
                                        + Добавить запись дневника
                                    </Link>
                                </div>
                            ) : (
                                <DiaryEntryPicker
                                    entries={entriesForDate}
                                    selectedEntryId={diaryEntryId}
                                    onSelect={setDiaryEntryId}
                                />
                            )
                        }

                        {
                            error && (
                                <p className="complex-completion-form__error">{error}</p>
                            )
                        }

                        <div className="complex-completion-form__actions">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("result")}
                            >
                                Назад
                            </Button>

                            <Button
                                type="button"
                                onClick={() => {
                                    setError(undefined);
                                    setStep("confirm");
                                }}
                                disabled={!diaryEntryId}
                            >
                                Далее
                            </Button>
                        </div>
                    </>
                )
            }

            {
                step === "confirm" && (
                    <>
                        <h3 className="complex-completion-form__title">Результат</h3>

                        <div className="complex-completion-form__summary">
                            <p className="complex-completion-form__summary-name">
                                {complexDef.name}
                            </p>

                            <ComplexStars stars={previewStars} />

                            {
                                selectedDiaryEntry && (
                                    <p className="complex-completion-form__summary-diary">
                                        Запись дневника: {formatDate(selectedDiaryEntry.date)} ·{" "}
                                        {selectedDiaryEntry.title}
                                    </p>
                                )
                            }
                        </div>

                        {
                            error && (
                                <p className="complex-completion-form__error">{error}</p>
                            )
                        }

                        <div className="complex-completion-form__actions">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("diary")}
                                disabled={isSubmitting}
                            >
                                Назад
                            </Button>

                            <Button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSubmitting || !diaryEntryId}
                            >
                                {submitLabel}
                            </Button>
                        </div>
                    </>
                )
            }
        </div>
    );
}
