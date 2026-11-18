import type {
    ProgramBlockItem,
    ProgramScheme,
    ProgramTargetKind,
} from "../types/program";

import {
    formatDuration,
    getBlockSets,
    getSetRounds,
    hasSupersets,
    isEmomTogetherSet,
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

    /** EMOM «все вместе»: все упражнения сета, выполняемые в одном
     *  интервале (item и groupKey шага — у первого из них). Нет у
     *  остальных шагов. */
    together?: RunTogetherEntry[];

    /** Отдых после шага, секунды; у последнего шага — null. */
    restAfter: number | null;
    restKind: RunRestKind | null;
};

/** Упражнение интервала EMOM «все вместе». */
export type RunTogetherEntry = {
    item: ProgramBlockItem;
    groupKey: string;

    /** Ориентир автора для числа повторений. */
    reps: number;
};

type SetRun = { setIndex: number; round: number };

/** Упражнения, которые выполняются по таймеру: секунды, AMRAP, EMOM. */
export function isTimedKind(kind: ProgramTargetKind): boolean {
    return kind === "seconds" || kind === "amrap" || kind === "emom";
}

/** Виды, где человек отмечает только повторения за время (секунды
 *  известны по таймеру): AMRAP и EMOM. */
export function isRepsOnlyTimedKind(kind: ProgramTargetKind): boolean {
    return kind === "amrap" || kind === "emom";
}

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

            // «Все вместе»: весь сет — один шаг, один интервал.
            const together = isEmomTogetherSet(block, set);

            (together ? [set[0]] : set).forEach((item, itemIndex) => {
                let restAfter: number;
                let restKind: RunRestKind;

                if (!together && itemIndex < set.length - 1) {
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
                        item.target?.kind === "amrap" ||
                        item.target?.kind === "emom" ||
                        (item.target?.kind === "seconds" &&
                            item.target.withReps === true),
                    targetReps: item.target?.reps ?? 0,
                    groupKey: `${blockIndex}:${run.setIndex}:${itemIndex}`,
                    ...(together
                        ? {
                              together: set.map((entry, entryIndex) => ({
                                  item: entry,
                                  groupKey: `${blockIndex}:${run.setIndex}:${entryIndex}`,
                                  reps: entry.target?.reps ?? 0,
                              })),
                          }
                        : {}),
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

    /** EMOM: сколько повторений человек указал сейчас для упражнения
     *  (ключ — groupKey). Меняется в любой момент, а на нуле таймера
     *  значение записывается как результат подхода. */
    emomReps?: Record<string, number>;

    /** EMOM «все вместе»: повторения каждого упражнения в каждом
     *  интервале — индекс шага → ключ упражнения → повторения. */
    togetherReps?: Record<number, Record<string, number>>;
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
        emomReps:
            typeof state.emomReps === "object" && state.emomReps !== null
                ? state.emomReps
                : {},
        togetherReps:
            typeof state.togetherReps === "object" &&
            state.togetherReps !== null
                ? state.togetherReps
                : {},
    };
}

/** Нажали «Старт» на упражнении на время. */
export function startTimedWork(state: RunState, now: number): RunState {
    return state.workStartedAt === undefined
        ? { ...state, workStartedAt: now }
        : state;
}

/** Сколько повторений сейчас указано для EMOM-упражнения: то, что
 *  человек вписал, а пока он не менял — ориентир автора. */
export function emomRepsOf(state: RunState, step: RunStep): number {
    return emomRepsFor(state, step.groupKey, step.targetReps);
}

export function emomRepsFor(
    state: RunState,
    groupKey: string,
    fallback: number
): number {
    return state.emomReps?.[groupKey] ?? fallback;
}

export function setEmomReps(
    state: RunState,
    groupKey: string,
    value: number
): RunState {
    const safe = Math.min(MAX_RESULT, Math.max(0, Math.floor(value)));

    return {
        ...state,
        emomReps: { ...state.emomReps, [groupKey]: safe },
    };
}

/**
 * EMOM: следующий шаг начинается сам, если он тоже EMOM из того же сета
 * комплекса (то же упражнение в следующем подходе или следующее
 * упражнение сета) и между ними нет отдыха. Другие сеты и комплексы
 * автоматически не запускаются: там человека ждёт свой экран.
 */
export function emomContinues(
    step: RunStep,
    next: RunStep | undefined
): boolean {
    return (
        step.targetKind === "emom" &&
        next !== undefined &&
        next.targetKind === "emom" &&
        next.blockIndex === step.blockIndex &&
        next.setNumber === step.setNumber &&
        step.restAfter === 0
    );
}

/** Упражнение в окошках повторений EMOM. */
export type EmomPanelEntry = {
    groupKey: string;
    item: ProgramBlockItem;

    /** Ориентир автора. */
    reps: number;
};

/** Упражнения EMOM-сета для окошек повторений: каждое по одному разу, в
 *  порядке сета. У EMOM из одного упражнения — только оно, у «все
 *  вместе» — все упражнения интервала. */
export function emomPanel(steps: RunStep[], step: RunStep): EmomPanelEntry[] {
    if (step.together) {
        return step.together;
    }

    const seen = new Set<string>();
    const entries: EmomPanelEntry[] = [];

    steps.forEach((item) => {
        if (
            item.targetKind !== "emom" ||
            item.blockIndex !== step.blockIndex ||
            item.setNumber !== step.setNumber ||
            seen.has(item.groupKey)
        ) {
            return;
        }

        seen.add(item.groupKey);
        entries.push({
            groupKey: item.groupKey,
            item: item.item,
            reps: item.targetReps,
        });
    });

    return entries;
}

/** Как называть шаг: у «все вместе» — все упражнения интервала. */
export function describeStepName(
    step: RunStep,
    nameOf: (item: ProgramBlockItem) => string
): string {
    return step.together
        ? step.together.map((entry) => nameOf(entry.item)).join(" + ")
        : nameOf(step.item);
}

/**
 * EMOM: когда таймер дошёл до нуля, подход закончен — повторения
 * записываются по значению в окошке на этот момент. Если следом идёт
 * следующий EMOM этого же сета без отдыха, он начинается сам, с
 * момента нуля (а не «сейчас»: так время не накапливает погрешность),
 * иначе — обычное завершение (отдых или конец схемы). Если вкладка
 * какое-то время не работала, пройденные за это время интервалы
 * закрываются по очереди. Если ничего не изменилось, возвращает тот же
 * объект.
 */
export function advanceEmom(
    state: RunState,
    steps: RunStep[],
    now: number
): RunState {
    let current = state;

    for (let guard = 0; guard <= steps.length; guard += 1) {
        const step = steps[current.stepIndex];

        if (
            !step ||
            step.targetKind !== "emom" ||
            current.phase !== "work" ||
            current.workStartedAt === undefined
        ) {
            return current;
        }

        const endsAt = current.workStartedAt + step.targetValue * 1000;

        if (now < endsAt) {
            return current;
        }

        const next = steps[current.stepIndex + 1];
        const continues = emomContinues(step, next);

        const done = completeWork(current, steps, endsAt);

        if (!continues) {
            return done;
        }

        current = {
            ...done,
            stepIndex: current.stepIndex + 1,
            phase: "work",
            workStartedAt: endsAt,
            restEndsAt: undefined,
        };
    }

    return current;
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

    // У AMRAP и EMOM время ограничено таймером: больше отведённого не
    // бывает.
    const timedLimit = isRepsOnlyTimedKind(step.targetKind)
        ? step.targetValue
        : MAX_RESULT;

    const result =
        isTimedKind(step.targetKind) && state.workStartedAt !== undefined
            ? Math.min(
                  timedLimit,
                  Math.max(1, Math.round((now - state.workStartedAt) / 1000))
              )
            : step.targetValue;

    const results = { ...state.results, [state.stepIndex]: result };

    // Повторения за время предлагаем по ориентиру автора — человек
    // поправит.
    // У EMOM — то, что указано в окошке на этот момент.
    const repsResults = step.trackReps
        ? {
              ...state.repsResults,
              [state.stepIndex]:
                  step.targetKind === "emom"
                      ? emomRepsOf(state, step)
                      : step.targetReps,
          }
        : state.repsResults;

    // «Все вместе»: повторения каждого упражнения интервала на этот
    // момент.
    const togetherReps = step.together
        ? {
              ...state.togetherReps,
              [state.stepIndex]: Object.fromEntries(
                  step.together.map((entry) => [
                      entry.groupKey,
                      emomRepsFor(state, entry.groupKey, entry.reps),
                  ])
              ),
          }
        : state.togetherReps;

    if (step.restAfter === null) {
        return {
            ...state,
            phase: "finished",
            results,
            repsResults,
            togetherReps,
            workStartedAt: undefined,
            restEndsAt: undefined,
        };
    }

    return {
        ...state,
        phase: "rest",
        results,
        repsResults,
        togetherReps,
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

/** EMOM «все вместе»: поправить повторения упражнения в интервале. */
export function setTogetherReps(
    state: RunState,
    stepIndex: number,
    groupKey: string,
    value: number
): RunState {
    const safe = Math.min(MAX_RESULT, Math.max(0, Math.floor(value)));

    return {
        ...state,
        togetherReps: {
            ...state.togetherReps,
            [stepIndex]: {
                ...state.togetherReps?.[stepIndex],
                [groupKey]: safe,
            },
        },
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
    // «Максимум» — это повторения: результат отмечается числом.
    return isTimedKind(kind)
        ? pluralizeRu(value, ["секунда", "секунды", "секунд"])
        : pluralizeRu(value, ["повторение", "повторения", "повторений"]);
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
    repsResults: Record<number, number> = {},
    togetherReps: Record<number, Record<string, number>> = {}
): RunSummaryBlock[] {
    const groups = new Map<
        string,
        {
            step: RunStep;
            item: ProgramBlockItem;
            values: number[];
            reps: number[];
        }
    >();

    steps.forEach((step) => {
        const value = results[step.index];

        if (value === undefined) {
            return;
        }

        // «Все вместе»: в одном интервале несколько упражнений, у
        // каждого свои повторения.
        const entries = step.together
            ? step.together.map((entry) => ({
                  groupKey: entry.groupKey,
                  item: entry.item,
                  reps: togetherReps[step.index]?.[entry.groupKey] ?? entry.reps,
              }))
            : [
                  {
                      groupKey: step.groupKey,
                      item: step.item,
                      reps: repsResults[step.index] ?? step.targetReps,
                  },
              ];

        entries.forEach(({ groupKey, item, reps }) => {
            const group = groups.get(groupKey);

            if (group) {
                group.values.push(value);
                group.reps.push(reps);
            } else {
                groups.set(groupKey, {
                    step,
                    item,
                    values: [value],
                    reps: [reps],
                });
            }
        });
    });

    const blocks: RunSummaryBlock[] = [];

    groups.forEach(({ step, item, values, reps }) => {
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

        // EMOM: главное — повторения по подходам, «10, 8, 5 повторений
        // (EMOM, 40 секунд)»; секунды у всех подходов одинаковые.
        set.entries.push({
            name: nameOf(item),
            results:
                step.targetKind === "emom"
                    ? `${reps.join(", ")} ${resultUnit("reps", reps[reps.length - 1])} (EMOM, ${formatDuration(step.targetValue)})`
                    : `${values.join(", ")} ${resultUnit(step.targetKind, last)}${repsNote}`,
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

    /** EMOM «все вместе» (см. RunState.togetherReps). */
    togetherReps?: Record<number, Record<string, number>>;
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
        input.repsResults,
        input.togetherReps
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
