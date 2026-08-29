import type {
    Complex,
    ComparisonOperator,
    MetricType,
    StarCondition,
} from "../types/complex";
import type { ComplexCompletion } from "../types/complexCompletion";
import type { NewComplexCompletion } from "../types/newComplexCompletion";

const TIME_LIKE_METRICS: MetricType[] = ["time", "duration"];

export function isTimeBasedComplex(complexDef: Complex): boolean {
    return complexDef.resultMetrics.some((metric) =>
        TIME_LIKE_METRICS.includes(metric)
    );
}

/** "04:52" -> 292. Возвращает undefined, если строка не распознана. */
export function parseClockToSeconds(value: string): number | undefined {
    const trimmed = value.trim();

    if (trimmed === "") {
        return undefined;
    }

    const match = /^(\d{1,3}):([0-5]?\d)$/.exec(trimmed);

    if (!match) {
        return undefined;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);

    return minutes * 60 + seconds;
}

/** 292 -> "04:52"; 3841 -> "1:04:01" */
export function formatSecondsAsClock(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const metricFieldByType: Record<
    MetricType,
    keyof NewComplexCompletion & keyof ComplexCompletion
> = {
    time: "resultTimeSeconds",
    reps: "resultReps",
    sets: "resultSets",
    rounds: "resultRounds",
    duration: "resultDurationSeconds",
    count: "resultCount",
};

export function getMetricValue(
    data: Partial<NewComplexCompletion> | ComplexCompletion,
    metric: MetricType
): number | undefined {
    const value = data[metricFieldByType[metric]] as number | undefined;

    return typeof value === "number" ? value : undefined;
}

/** Естественно-языковое описание условия — как в п.8 UX-документа. */
export function formatStarCondition(condition: StarCondition): string {
    const operatorSymbol: Record<ComparisonOperator, string> = {
        lte: "≤",
        gte: "≥",
        eq: "=",
    };

    if (condition.metric === "time" || condition.metric === "duration") {
        return `Время ${operatorSymbol[condition.operator]} ${formatSecondsAsClock(condition.value)}`;
    }

    const labels: Record<MetricType, string> = {
        time: "Время",
        duration: "Продолжительность",
        reps: "Повторений",
        sets: "Подходов",
        rounds: "Кругов",
        count: condition.unit || "Значение",
    };

    const valueDisplay = Number.isInteger(condition.value)
        ? condition.value
        : condition.value.toFixed(1);

    const unitSuffix = condition.unit ? ` ${condition.unit}` : "";

    return `${labels[condition.metric]} ${operatorSymbol[condition.operator]} ${valueDisplay}${unitSuffix}`;
}

function compare(
    value: number,
    operator: ComparisonOperator,
    target: number
): boolean {
    if (operator === "lte") return value <= target;
    if (operator === "gte") return value >= target;

    return value === target;
}

/**
 * Предпросмотр звёзд по мере заполнения формы (п.18 UX-документа —
 * «система показывает предварительный результат»). Логика зеркалит
 * app/routers/complexes.py:_calculate_stars — авторитетный расчёт
 * всё равно делает сервер при сохранении.
 */
export function calculatePreviewStars(
    complexDef: Complex,
    data: Partial<NewComplexCompletion>
): number {
    let stars = 1;

    const sortedConditions = [...complexDef.starConditions].sort(
        (a, b) => b.stars - a.stars
    );

    for (const condition of sortedConditions) {
        const value = getMetricValue(data, condition.metric);

        if (value === undefined) {
            continue;
        }

        if (compare(value, condition.operator, condition.value)) {
            stars = condition.stars;
            break;
        }
    }

    return stars;
}

/** Форматирует результат выполнения для отображения в истории/карточке. */
export function formatCompletionResult(
    complexDef: Complex,
    completion: ComplexCompletion
): string {
    const parts: string[] = [];

    for (const metric of complexDef.resultMetrics) {
        const value = getMetricValue(completion, metric);

        if (value === undefined) {
            continue;
        }

        if (metric === "time" || metric === "duration") {
            parts.push(formatSecondsAsClock(value));
        } else {
            const unitLabel: Record<MetricType, string> = {
                time: "",
                duration: "",
                reps: "повторений",
                sets: "подходов",
                rounds: "раундов",
                count: "",
            };
            parts.push(`${value} ${unitLabel[metric]}`.trim());
        }
    }

    return parts.join(" · ");
}

/**
 * Лучший результат пользователя по правилам п.21 документа: больше
 * звёзд лучше; при равенстве звёзд — меньшее время для временных
 * комплексов и большее значение основного показателя для объёмных.
 */
export function findBestCompletion(
    complexDef: Complex,
    completions: ComplexCompletion[]
): ComplexCompletion | undefined {
    if (completions.length === 0) {
        return undefined;
    }

    const timeBased = isTimeBasedComplex(complexDef);

    function score(completion: ComplexCompletion): number {
        if (timeBased) {
            const metric = complexDef.resultMetrics.includes("time")
                ? "time"
                : "duration";
            const value = getMetricValue(completion, metric);

            return value === undefined ? Number.NEGATIVE_INFINITY : -value;
        }

        const metric = complexDef.resultMetrics[0];
        const value = metric ? getMetricValue(completion, metric) : undefined;

        return value === undefined ? Number.NEGATIVE_INFINITY : value;
    }

    return completions.reduce((best, current) => {
        if (current.stars !== best.stars) {
            return current.stars > best.stars ? current : best;
        }

        return score(current) > score(best) ? current : best;
    });
}
