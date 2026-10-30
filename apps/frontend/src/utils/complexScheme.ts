import type { MetricType } from "../types/complex";
import type { SchemeBlock, SchemeItem } from "../types/complexScheme";

/**
 * Описание и расчёты по структурированной схеме комплекса: подписи
 * нагрузки, временные интервалы, итоги (число упражнений, время,
 * повторения). Только чистые функции — без React и без запросов, чтобы
 * ими пользовались и страница комплекса, и карточка, и предпросмотр в
 * форме, и чтобы их можно было проверять отдельно.
 */

// --- Русские формы слов и время -------------------------------------------

/** Форма слова по числу: 1 повторение, 2 повторения, 5 повторений. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;

    if (abs > 10 && abs < 20) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;

    return many;
}

/**
 * "3 минуты", "45 секунд", "1 мин 30 с", "1 час" — для итогов и
 * подписей общего времени.
 */
export function formatSeconds(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours === 0 && minutes === 0) {
        return `${seconds} ${pluralRu(seconds, "секунда", "секунды", "секунд")}`;
    }

    if (hours === 0 && seconds === 0) {
        return `${minutes} ${pluralRu(minutes, "минута", "минуты", "минут")}`;
    }

    if (hours > 0 && minutes === 0 && seconds === 0) {
        return `${hours} ${pluralRu(hours, "час", "часа", "часов")}`;
    }

    if (hours === 0) {
        return `${minutes} мин ${seconds} с`;
    }

    return seconds === 0
        ? `${hours} ч ${minutes} мин`
        : `${hours} ч ${minutes} мин ${seconds} с`;
}

/**
 * Длительность внутри фразы ("за 60 секунд"): до 90 секунд включительно
 * — в секундах (так привычнее: "за 60 секунд", а не "за 1 минуту"),
 * дальше — как formatSeconds.
 */
export function formatWorkDuration(totalSeconds: number): string {
    if (totalSeconds <= 90) {
        return `${totalSeconds} ${pluralRu(totalSeconds, "секунда", "секунды", "секунд")}`;
    }

    return formatSeconds(totalSeconds);
}

/** Время на часах: 0:00, 1:30, 12:05; от часа — 1:02:03. */
export function formatClock(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const two = (n: number) => String(n).padStart(2, "0");

    return hours > 0
        ? `${hours}:${two(minutes)}:${two(seconds)}`
        : `${minutes}:${two(seconds)}`;
}

// --- Одна строка схемы ---------------------------------------------------------

const MINUS = "−";

/**
 * Сколько повторений в строке на данном круге/подходе (индекс с нуля) —
 * с учётом прогрессии и её границы. Меньше одного не бывает.
 */
export function repsInRound(item: SchemeItem, roundIndex: number): number {
    if (item.reps === null) {
        return 0;
    }

    let value = item.reps + item.repsStep * roundIndex;

    if (item.repsLimit !== null) {
        value =
            item.repsStep < 0
                ? Math.max(value, item.repsLimit)
                : Math.min(value, item.repsLimit);
    }

    return Math.max(value, 1);
}

function roundWord(block: SchemeBlock, plural: "one" | "few" | "many"): string {
    const words =
        block.roundsKind === "sets"
            ? { one: "подход", few: "подхода", many: "подходов" }
            : { one: "круг", few: "круга", many: "кругов" };

    return words[plural];
}

/** "11 кругов", "3 подхода"; для AMRAP (rounds = null) — null. */
export function formatRounds(block: SchemeBlock): string | null {
    if (block.rounds === null) {
        return null;
    }

    return `${block.rounds} ${pluralRu(
        block.rounds,
        roundWord(block, "one"),
        roundWord(block, "few"),
        roundWord(block, "many")
    )}`;
}

function repsWord(n: number): string {
    return pluralRu(n, "повторение", "повторения", "повторений");
}

/**
 * Подпись нагрузки строки — одно предложение:
 *  "10 повторений." / "Максимальное количество повторений за 60 секунд." /
 *  "30 секунд." / "5 повторений за 40 секунд." /
 *  "10 повторений, −1 за круг, не ниже 5."
 * Пустая строка, если нагрузка не задана.
 */
export function describeItem(item: SchemeItem, block: SchemeBlock): string {
    const duration =
        item.durationSeconds !== null ? formatWorkDuration(item.durationSeconds) : null;

    if (item.maxEffort) {
        return duration
            ? `Максимальное количество повторений за ${duration}.`
            : "Максимальное количество повторений (до отказа).";
    }

    if (item.reps !== null) {
        let text = `${item.reps} ${repsWord(item.reps)}`;

        if (duration) {
            text += ` за ${duration}`;
        }

        // Прогрессию показываем, только если у блока вообще есть повторы.
        if (item.repsStep !== 0 && block.rounds !== 1) {
            const per = block.roundsKind === "sets" ? "подход" : "круг";
            const step = `${item.repsStep < 0 ? MINUS : "+"}${Math.abs(item.repsStep)} за ${per}`;

            text += `, ${step}`;

            if (item.repsLimit !== null) {
                text += item.repsStep < 0
                    ? `, не ниже ${item.repsLimit}`
                    : `, не больше ${item.repsLimit}`;
            }
        }

        return `${text}.`;
    }

    if (duration) {
        return `${duration.charAt(0).toUpperCase()}${duration.slice(1)}.`;
    }

    return "";
}

/** Задана ли у строки нагрузка (повторения, максимум или время). */
export function hasWorkload(item: SchemeItem): boolean {
    return item.reps !== null || item.maxEffort || item.durationSeconds !== null;
}

// --- Время ---------------------------------------------------------------------------

export type BlockTime = {
    seconds: number;

    /**
     * true — время точное (сложено из длительностей и отдыха);
     * false — это лимит времени блока (AMRAP или «не дольше»).
     */
    exact: boolean;
};

/**
 * Сколько длится блок. null — неизвестно (в каких-то строках нагрузка
 * не по времени, например "10 повторений": сколько это займёт, зависит
 * от человека).
 */
export function blockTime(block: SchemeBlock): BlockTime | null {
    if (block.timeLimitSeconds !== null) {
        return { seconds: block.timeLimitSeconds, exact: false };
    }

    if (block.rounds === null) {
        return null;
    }

    const durations = block.items.map((item) => item.durationSeconds);

    if (durations.length === 0 || durations.some((d) => d === null)) {
        return null;
    }

    const work = (durations as number[]).reduce((sum, d) => sum + d, 0);
    const restInside = (block.restBetweenItemsSeconds ?? 0) * (block.items.length - 1);
    const perRound = work + restInside;
    const restBetweenRounds = (block.restBetweenRoundsSeconds ?? 0) * (block.rounds - 1);

    return { seconds: perRound * block.rounds + restBetweenRounds, exact: true };
}

/** Общее время схемы: null — неизвестно хотя бы у одного блока. */
export function schemeTime(scheme: SchemeBlock[]): BlockTime | null {
    let seconds = 0;
    let exact = true;

    for (const block of scheme) {
        const time = blockTime(block);

        if (time === null) {
            return null;
        }

        seconds += time.seconds;
        exact = exact && time.exact;
    }

    return scheme.length > 0 ? { seconds, exact } : null;
}

export type ItemRange = { start: number; end: number };

/**
 * Временные интервалы строк — "0:00–1:00", "1:00–2:00". Считаются, только
 * когда они однозначны: блок идёт один раз, у всех его строк есть
 * длительность, и время всех предыдущих блоков известно и точно. Иначе
 * (круги, подходы, нагрузка в повторениях) интервалов нет — null.
 *
 * Результат: для каждого блока — массив интервалов по его строкам либо null.
 */
export function itemRanges(scheme: SchemeBlock[]): (ItemRange[] | null)[] {
    let offset: number | null = 0;

    return scheme.map((block) => {
        const time = blockTime(block);
        const startOfBlock = offset;

        offset =
            offset !== null && time !== null && time.exact ? offset + time.seconds : null;

        if (startOfBlock === null || block.rounds !== 1 || time === null || !time.exact) {
            return null;
        }

        let cursor = startOfBlock;

        return block.items.map((item, index) => {
            const start = cursor;
            const end = start + (item.durationSeconds ?? 0);

            cursor = end + (index < block.items.length - 1 ? (block.restBetweenItemsSeconds ?? 0) : 0);

            return { start, end };
        });
    });
}

// --- Итоги -------------------------------------------------------------------------------

/**
 * Сумма повторений по всей схеме с учётом кругов и прогрессии. null —
 * если хотя бы в одной строке повторения не заданы числом ("максимум",
 * время) либо у блока "сколько успеете".
 */
export function totalReps(scheme: SchemeBlock[]): number | null {
    let total = 0;

    for (const block of scheme) {
        if (block.rounds === null) {
            return null;
        }

        for (const item of block.items) {
            if (item.reps === null || item.maxEffort) {
                return null;
            }

            for (let round = 0; round < block.rounds; round += 1) {
                total += repsInRound(item, round);
            }
        }
    }

    return scheme.length > 0 ? total : null;
}

export type SchemeSummary = {
    /** Строк схемы (упражнений с повторами, без умножения на круги). */
    exercisesCount: number;
    blocksCount: number;
    time: BlockTime | null;
    totalReps: number | null;
    hasMaxEffort: boolean;
};

export function summarizeScheme(scheme: SchemeBlock[]): SchemeSummary {
    return {
        exercisesCount: scheme.reduce((sum, block) => sum + block.items.length, 0),
        blocksCount: scheme.length,
        time: schemeTime(scheme),
        totalReps: totalReps(scheme),
        hasMaxEffort: scheme.some((block) => block.items.some((item) => item.maxEffort)),
    };
}

/**
 * Строка итогов под заголовком: "3 упражнения · 3 минуты · Максимум
 * повторений" / "4 упражнения · 11 кругов · 580 повторений".
 */
export function buildSchemeMeta(
    scheme: SchemeBlock[],
    resultMetrics: MetricType[] = []
): string[] {
    const summary = summarizeScheme(scheme);
    const parts: string[] = [];

    parts.push(
        `${summary.exercisesCount} ${pluralRu(
            summary.exercisesCount,
            "упражнение",
            "упражнения",
            "упражнений"
        )}`
    );

    if (scheme.length === 1) {
        const rounds = formatRounds(scheme[0]);

        if (rounds && scheme[0].rounds !== 1) {
            parts.push(rounds);
        }
    } else if (scheme.length > 1) {
        parts.push(
            `${scheme.length} ${pluralRu(scheme.length, "блок", "блока", "блоков")}`
        );
    }

    if (summary.time) {
        parts.push(
            summary.time.exact
                ? formatSeconds(summary.time.seconds)
                : `лимит ${formatSeconds(summary.time.seconds)}`
        );
    }

    if (summary.totalReps !== null) {
        parts.push(`${summary.totalReps} ${repsWord(summary.totalReps)}`);
    }

    if (summary.hasMaxEffort) {
        parts.push("Максимум повторений");
    } else if (!summary.time && resultMetrics.includes("time")) {
        parts.push("На время");
    }

    return parts;
}
