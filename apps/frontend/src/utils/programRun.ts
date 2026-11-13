import type {
    ProgramBlockItem,
    ProgramScheme,
    ProgramTargetKind,
} from "../types/program";

import {
    getBlockSets,
    getSetRounds,
    hasSupersets,
    roundsAreCircles,
} from "./programAuto";
import { pluralizeRu } from "./pluralize";

/**
 * Прохождение автоматической схемы: из схемы строится последовательность
 * рабочих шагов (одно упражнение в одном подходе), у каждого шага —
 * отдых после него. Состояние прохождения — небольшая структура, которая
 * хранится в браузере (чтобы можно было вернуться), а все переходы
 * между шагами — чистые функции, принимающие текущее время.
 */

// --- Шаги ----------------------------------------------------------------

export type RunRestKind =
    | "within-set"
    | "between-rounds"
    | "between-sets"
    | "between-blocks";

export type RunStep = {
    index: number;

    blockIndex: number;
    blocksCount: number;
    blockTitle: string;

    /** Номер сета в комплексе (с 1) и сколько сетов, показывать ли их
     *  человеку (только если в комплексе есть суперсеты). */
    setNumber: number;
    setsCount: number;
    showSet: boolean;

    /** Какой подход (круг) этого сета и сколько всего. */
    round: number;
    rounds: number;
    roundsAreCircles: boolean;

    item: ProgramBlockItem;
    targetKind: ProgramTargetKind;
    targetValue: number;

    /** Упражнение на время, в котором человек отмечает ещё и сделанные
     *  повторения; targetReps — их ориентир (значение по умолчанию, во
     *  время выполнения не показывается). */
    trackReps: boolean;
    targetReps: number;

    /** Ключ упражнения в комплексе — один и тот же во всех подходах. */
    groupKey: string;

    /** Отдых после шага, секунды; у последнего шага — null. */
    restAfter: number | null;
    restKind: RunRestKind | null;
};

type SetRun = { setIndex: number; round: number };

export function buildRunSteps(scheme: ProgramScheme): RunStep[] {
    const steps: RunStep[] = [];
    const blocks = scheme.blocks.filter((block) => block.items.length > 0);

    blocks.forEach((block, blockIndex) => {
        const sets = getBlockSets(block);
        const rounds = getSetRounds(block).map((count) => count ?? 1);
        const interleaved = block.order === "interleaved" && sets.length > 1;
        const supersets = hasSupersets(block);
        const circles = roundsAreCircles(block);

        // В каком порядке проходятся сеты: «по кругу» — сет 1, сет 2 …
        // и так круг за кругом; «по очереди» — все подходы сета 1, затем
        // сета 2.
        const runs: SetRun[] = [];

        if (interleaved) {
            for (let lap = 1; lap <= rounds[0]; lap += 1) {
                sets.forEach((_set, setIndex) =>
                    runs.push({ setIndex, round: lap })
                );
            }
        } else {
            sets.forEach((_set, setIndex) => {
                for (let round = 1; round <= rounds[setIndex]; round += 1) {
                    runs.push({ setIndex, round });
                }
            });
        }

        runs.forEach((run, runIndex) => {
            const set = sets[run.setIndex];
            const nextRun = runs[runIndex + 1];

            set.forEach((item, itemIndex) => {
                let restAfter: number;
                let restKind: RunRestKind;

                if (itemIndex < set.length - 1) {
                    restAfter = block.restWithinSet ?? 0;
                    restKind = "within-set";
                } else if (nextRun) {
                    const nextIsNewRound = interleaved
                        ? nextRun.round > run.round
                        : nextRun.setIndex === run.setIndex;

                    restAfter = nextIsNewRound
                        ? block.restBetweenRounds ?? 0
                        : block.restBetweenSets ?? 0;
                    restKind = nextIsNewRound
                        ? "between-rounds"
                        : "between-sets";
                } else {
                    // Конец комплекса: если после него есть следующий,
                    // отдых «после комплекса» или, если не задан, «между
                    // сетами».
                    restAfter =
                        block.restAfterBlock ?? block.restBetweenSets ?? 0;
                    restKind = "between-blocks";
                }

                steps.push({
                    index: steps.length,
                    blockIndex,
                    blocksCount: blocks.length,
                    blockTitle: block.title,
                    setNumber: run.setIndex + 1,
                    setsCount: sets.length,
                    showSet: supersets,
                    round: run.round,
                    rounds: interleaved ? rounds[0] : rounds[run.setIndex],
                    roundsAreCircles: circles,
                    item,
                    targetKind: item.target?.kind ?? "reps",
                    targetValue: item.target?.value ?? 0,
                    trackReps:
                        item.target?.kind === "seconds" &&
                        item.target.withReps === true,
                    targetReps: item.target?.reps ?? 0,
                    groupKey: `${blockIndex}:${run.setIndex}:${itemIndex}`,
                    restAfter,
                    restKind,
                });
            });
        });
    });

    const last = steps[steps.length - 1];

    if (last) {
        last.restAfter = null;
        last.restKind = null;
    }

    return steps;
}

// --- Состояние прохождения -------------------------------------------------

export type RunPhase = "work" | "rest" | "finished";

export type RunIds = {
    programId: string;
    versionId: string;
    schemeId: string;
};

export type RunState = RunIds & {
    version: 1;
    startedAt: number;

    /** Индекс текущего рабочего шага. */
    stepIndex: number;

    /**
     * work — выполняется шаг stepIndex; rest — отдых после него (на
     * нём человек отмечает результат шага); finished — последний шаг
     * сделан.
     */
    phase: RunPhase;

    /** Когда нажали «Старт» на упражнении на время. */
    workStartedAt?: number;

    /** Когда закончится отдых; нет — отдыха нет, ждём «Дальше». */
    restEndsAt?: number;

    /** Результат каждого шага: повторения или секунды. */
    results: Record<number, number>;

    /** Повторения, сделанные за время, — только у шагов с trackReps. */
    repsResults: Record<number, number>;
};

export const MAX_RESULT = 9999;

export function runStorageKey(ids: RunIds): string {
    return `swo:program-run:${ids.programId}:${ids.versionId}:${ids.schemeId}`;
}

export function createRun(ids: RunIds, now: number): RunState {
    return {
        ...ids,
        version: 1,
        startedAt: now,
        stepIndex: 0,
        phase: "work",
        results: {},
        repsResults: {},
    };
}

/** Восстановить состояние из сохранённого JSON; null, если оно не
 *  подходит (другая схема или версия, схема изменилась, мусор). */
export function parseRunState(
    raw: unknown,
    ids: RunIds,
    stepsCount: number
): RunState | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const state = raw as Partial<RunState>;

    const valid =
        state.version === 1 &&
        state.programId === ids.programId &&
        state.versionId === ids.versionId &&
        state.schemeId === ids.schemeId &&
        typeof state.startedAt === "number" &&
        typeof state.stepIndex === "number" &&
        Number.isInteger(state.stepIndex) &&
        state.stepIndex >= 0 &&
        state.stepIndex < stepsCount &&
        (state.phase === "work" ||
            state.phase === "rest" ||
            state.phase === "finished") &&
        typeof state.results === "object" &&
        state.results !== null;

    if (!valid) {
        return null;
    }

    // Фаза «finished» возможна только на последнем шаге.
    if (state.phase === "finished" && state.stepIndex !== stepsCount - 1) {
        return null;
    }

    // Состояние, сохранённое до появления повторений за время.
    return {
        ...(state as RunState),
        repsResults:
            typeof state.repsResults === "object" && state.repsResults !== null
                ? state.repsResults
                : {},
    };
}

/** Нажали «Старт» на упражнении на время. */
export function startTimedWork(state: RunState, now: number): RunState {
    return state.workStartedAt === undefined
        ? { ...state, workStartedAt: now }
        : state;
}

/**
 * Подход сделан. Результат пока предполагаемый — для повторений это
 * цель, для упражнения на время реально прошедшее время — и человек
 * поправит его во время отдыха (так отдых не теряется). Сразу
 * запускается отдых, если он есть.
 */
export function completeWork(
    state: RunState,
    steps: RunStep[],
    now: number
): RunState {
    const step = steps[state.stepIndex];

    const result =
        step.targetKind === "seconds" && state.workStartedAt !== undefined
            ? Math.min(
                  MAX_RESULT,
                  Math.max(1, Math.round((now - state.workStartedAt) / 1000))
              )
            : step.targetValue;

    const results = { ...state.results, [state.stepIndex]: result };

    // Повторения за время предлагаем по ориентиру автора — человек
    // поправит.
    const repsResults = step.trackReps
        ? { ...state.repsResults, [state.stepIndex]: step.targetReps }
        : state.repsResults;

    if (step.restAfter === null) {
        return {
            ...state,
            phase: "finished",
            results,
            repsResults,
            workStartedAt: undefined,
            restEndsAt: undefined,
        };
    }

    return {
        ...state,
        phase: "rest",
        results,
        repsResults,
        workStartedAt: undefined,
        restEndsAt: step.restAfter > 0 ? now + step.restAfter * 1000 : undefined,
    };
}

export function setStepResult(
    state: RunState,
    stepIndex: number,
    value: number
): RunState {
    const safe = Math.min(MAX_RESULT, Math.max(0, Math.floor(value)));

    return { ...state, results: { ...state.results, [stepIndex]: safe } };
}

/** Сколько повторений сделано за время упражнения на время. */
export function setStepReps(
    state: RunState,
    stepIndex: number,
    value: number
): RunState {
    const safe = Math.min(MAX_RESULT, Math.max(0, Math.floor(value)));

    return {
        ...state,
        repsResults: { ...state.repsResults, [stepIndex]: safe },
    };
}

/** «+30 секунд» к отдыху; если отдыха не было или он уже закончился —
 *  отсчёт начинается с текущего момента. */
export function extendRest(
    state: RunState,
    seconds: number,
    now: number
): RunState {
    const base = Math.max(state.restEndsAt ?? now, now);

    return { ...state, restEndsAt: base + seconds * 1000 };
}

/** Закончили отдых — следующий шаг. */
export function goToNextStep(state: RunState, steps: RunStep[]): RunState {
    if (state.stepIndex >= steps.length - 1) {
        return { ...state, phase: "finished", restEndsAt: undefined };
    }

    return {
        ...state,
        stepIndex: state.stepIndex + 1,
        phase: "work",
        workStartedAt: undefined,
        restEndsAt: undefined,
    };
}

// --- Время и подписи --------------------------------------------------------

/** Сколько секунд осталось до конца отдыха; отрицательное — отдых
 *  закончился столько секунд назад. */
export function restRemainingSeconds(state: RunState, now: number): number {
    return state.restEndsAt === undefined
        ? 0
        : Math.ceil((state.restEndsAt - now) / 1000);
}

/** 125 → «2:05». */
export function formatClock(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function resultUnit(kind: ProgramTargetKind, value: number): string {
    return kind === "reps"
        ? pluralizeRu(value, ["повторение", "повторения", "повторений"])
        : pluralizeRu(value, ["секунда", "секунды", "секунд"]);
}

/** Сколько всего отдыха в схеме (для обзора перед стартом). */
export function totalRestSeconds(steps: RunStep[]): number {
    return steps.reduce((sum, step) => sum + (step.restAfter ?? 0), 0);
}

// --- Итог ---------------------------------------------------------------

export type RunSummaryEntry = {
    /** Название упражнения. */
    name: string;

    /** «10, 10, 8 повторений» — результаты по подходам и единица. */
    results: string;
};

export type RunSummarySet = {
    /** Номер сета; null — сеты в комплексе не показываются (суперсетов
     *  нет, каждое упражнение и есть сет). */
    number: number | null;

    rounds: number;
    roundsAreCircles: boolean;
    entries: RunSummaryEntry[];
};

export type RunSummaryBlock = {
    blockIndex: number;
    title: string;
    sets: RunSummarySet[];
};

/**
 * Что человек сделал, по комплексам, сетам и упражнениям. Подходы
 * одного упражнения сводятся в одну запись («10, 10, 8 повторений»),
 * всё идёт в порядке схемы.
 */
export function buildRunSummaryBlocks(
    steps: RunStep[],
    results: Record<number, number>,
    nameOf: (item: ProgramBlockItem) => string,
    repsResults: Record<number, number> = {}
): RunSummaryBlock[] {
    const groups = new Map<
        string,
        { step: RunStep; values: number[]; reps: number[] }
    >();

    steps.forEach((step) => {
        const value = results[step.index];

        if (value === undefined) {
            return;
        }

        const reps = repsResults[step.index] ?? step.targetReps;
        const group = groups.get(step.groupKey);

        if (group) {
            group.values.push(value);
            group.reps.push(reps);
        } else {
            groups.set(step.groupKey, { step, values: [value], reps: [reps] });
        }
    });

    const blocks: RunSummaryBlock[] = [];

    groups.forEach(({ step, values, reps }) => {
        let block = blocks.find((item) => item.blockIndex === step.blockIndex);

        if (!block) {
            block = {
                blockIndex: step.blockIndex,
                title: step.blockTitle.trim() || `Комплекс ${step.blockIndex + 1}`,
                sets: [],
            };
            blocks.push(block);
        }

        let set = block.sets.find(
            (item) => item.number === step.setNumber
        );

        if (!set) {
            set = {
                number: step.setNumber,
                rounds: step.rounds,
                roundsAreCircles: step.roundsAreCircles,
                entries: [],
            };
            block.sets.push(set);
        }

        const last = values[values.length - 1];

        // У упражнения на время с подсчётом повторений — и секунды, и
        // повторения: «30, 30 секунд (повторений: 12, 10)».
        const repsNote = step.trackReps
            ? ` (повторений: ${reps.join(", ")})`
            : "";

        set.entries.push({
            name: nameOf(step.item),
            results: `${values.join(", ")} ${resultUnit(step.targetKind, last)}${repsNote}`,
        });
    });

    // Номера сетов человеку показываются только там, где в комплексе
    // есть суперсеты, — как и на странице схемы.
    const showSetsByBlock = new Map<number, boolean>();

    steps.forEach((step) => {
        showSetsByBlock.set(step.blockIndex, step.showSet);
    });

    blocks.forEach((block) => {
        if (!showSetsByBlock.get(block.blockIndex)) {
            block.sets.forEach((set) => {
                set.number = null;
            });
        }
    });

    return blocks;
}

export type RunDescriptionInput = {
    programTitle: string;
    sectionName?: string;
    schemeName: string;
    steps: RunStep[];
    results: Record<number, number>;

    /** Повторения за время (см. RunState.repsResults). */
    repsResults?: Record<number, number>;
    nameOf: (item: ProgramBlockItem) => string;

    /** Сколько минут длилась тренировка. */
    minutes: number;
};

/** Звёздочки в названии сломали бы разметку описания. */
function plainName(name: string): string {
    return name.replace(/\*/g, "").trim();
}

function describeSetHeading(set: RunSummarySet): string {
    const rounds =
        set.rounds > 1
            ? set.roundsAreCircles
                ? ` — ${set.rounds} ${pluralizeRu(set.rounds, ["круг", "круга", "кругов"])}`
                : ` — ${set.rounds} ${pluralizeRu(set.rounds, ["подход", "подхода", "подходов"])}`
            : "";

    return `Сет ${set.number}${rounds}`;
}

/**
 * Текст для записи в дневнике: какая схема выполнена и что человек
 * сделал. Разметка — та же лёгкая, что понимает описание записи
 * (**жирный**): жирным выделены названия упражнений (результаты — на
 * следующей строке) и, если комплексов несколько, их названия. Сеты —
 * только там, где в комплексе есть суперсеты, с числом подходов у
 * каждого.
 */
export function buildRunDescription(input: RunDescriptionInput): string {
    const where = [
        `Программа «${input.programTitle}»`,
        input.sectionName?.trim(),
        input.schemeName.trim(),
    ]
        .filter(Boolean)
        .join(", ");

    const blocks = buildRunSummaryBlocks(
        input.steps,
        input.results,
        input.nameOf,
        input.repsResults
    );

    const body = blocks
        .map((block) => {
            const hasSetHeadings = block.sets.some((set) => set.number !== null);

            const sets = block.sets
                .map((set) => {
                    const entries = set.entries
                        .map(
                            (entry) =>
                                `**${plainName(entry.name)}:**\n${entry.results}`
                        )
                        .join("\n");

                    return set.number === null
                        ? entries
                        : `${describeSetHeading(set)}\n${entries}`;
                })
                // Сеты разделяет пустая строка; упражнения без сетов
                // идут подряд.
                .join(hasSetHeadings ? "\n\n" : "\n");

            return blocks.length > 1 ? `**${block.title}**\n${sets}` : sets;
        })
        .join("\n\n");

    return [
        `${where}.`,
        body,
        `Время тренировки: около ${input.minutes} мин.`,
    ]
        .filter(Boolean)
        .join("\n\n");
}
