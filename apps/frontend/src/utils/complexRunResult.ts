import type { MetricType } from "../types/complex";

/** Что помощник вносит в результат комплекса сам. */
export type RunResultFields = {
    resultTimeSeconds?: number;
    resultReps?: number;
};

/** Показатели, которые помощник не считает: человек вводит их сам. */
export type ManualResultFields = {
    resultDurationSeconds?: number;
    resultSets?: number;
    resultRounds?: number;
    resultCount?: number;
};

/** Всё, что вносится в выполнение комплекса из помощника. */
export type CompletionResultFields = RunResultFields & ManualResultFields;

/** Только поля тех показателей, которые есть у комплекса. */
export function pickManualFields(
    resultMetrics: MetricType[],
    manual: ManualResultFields
): ManualResultFields {
    return {
        resultDurationSeconds: resultMetrics.includes("duration")
            ? manual.resultDurationSeconds
            : undefined,
        resultSets: resultMetrics.includes("sets") ? manual.resultSets : undefined,
        resultRounds: resultMetrics.includes("rounds")
            ? manual.resultRounds
            : undefined,
        resultCount: resultMetrics.includes("count")
            ? manual.resultCount
            : undefined,
    };
}

/** Те же правила, что у формы ручного выполнения: продолжительность
 *  обязательна, остальное — по желанию. */
export function validateManualResult(
    resultMetrics: MetricType[],
    manual: ManualResultFields
): string | undefined {
    if (
        resultMetrics.includes("duration") &&
        manual.resultDurationSeconds === undefined
    ) {
        return "Укажите продолжительность выполнения.";
    }

    return undefined;
}

/**
 * Результат прохождения для комплекса: автор отметил показатели результата
 * комплекса — «Время» заполняется общим временем от старта до финиша,
 * «Повторения» — общим числом повторений. Остальные показатели помощник
 * не знает (их вносят вручную).
 */
export function buildRunResultFields(
    resultMetrics: MetricType[],
    totals: { seconds: number; reps: number }
): RunResultFields {
    const fields: RunResultFields = {};

    if (resultMetrics.includes("time")) {
        fields.resultTimeSeconds = totals.seconds;
    }

    if (resultMetrics.includes("reps")) {
        fields.resultReps = totals.reps;
    }

    return fields;
}

/** Показатели комплекса, которые помощник заполнить не может. */
export function getManualMetrics(resultMetrics: MetricType[]): MetricType[] {
    return resultMetrics.filter(
        (metric) => metric !== "time" && metric !== "reps"
    );
}

/** 754 → «12:34», 3723 → «1:02:03». */
export function formatRunDuration(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    const two = (value: number) => String(value).padStart(2, "0");

    return hours > 0
        ? `${hours}:${two(minutes)}:${two(seconds)}`
        : `${minutes}:${two(seconds)}`;
}
