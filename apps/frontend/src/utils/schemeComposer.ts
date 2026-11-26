import type {
    ProgramBlock,
    ProgramBlockItem,
    ProgramItemTarget,
    ProgramScheme,
} from "../types/program";

import {
    MAX_ROUNDS,
    formatTarget,
    getAutoSchemeProblems,
    getBlockSets,
    hasPerSetRounds,
    syncEmomTogether,
} from "./programAuto";

/**
 * Помощники конструктора схем (components/SchemeComposer): заготовки
 * комплексов, правки, которые затрагивают сразу несколько полей, и
 * проверка. Работают с моделью автоматических схем программ
 * (ProgramBlock), её же сохраняет и сервер.
 */

let idCounter = 0;

function nextBlockId(): string {
    idCounter += 1;

    return `composer-block-${Date.now()}-${idCounter}`;
}

/** Упражнение, которое ещё не выбрано: пустой текст. Показывается как
 *  поле выбора и при проверке и переносе отбрасывается. */
export function createPendingItem(
    target: ProgramItemTarget = { kind: "reps", value: 10 },
    groupWithPrevious = false
): ProgramBlockItem {
    return {
        kind: "text",
        text: "",
        target,
        ...(groupWithPrevious ? { groupWithPrevious: true } : {}),
    };
}

export function isPendingItem(item: ProgramBlockItem): boolean {
    return item.kind === "text" && item.text.trim() === "";
}

export function createEmptyBlock(): ProgramBlock {
    return {
        id: nextBlockId(),
        title: "",
        items: [createPendingItem()],
        rounds: 1,
        order: "sequential",
    };
}

// --- Заготовки ------------------------------------------------------------

export type SchemePresetId =
    | "sets"
    | "circuit"
    | "superset"
    | "amrap"
    | "emom";

export type SchemePreset = {
    id: SchemePresetId;
    title: string;
    description: string;
    create: () => ProgramBlock;
};

export const SCHEME_PRESETS: SchemePreset[] = [
    {
        id: "sets",
        title: "Подходы",
        description: "Одно упражнение несколько раз, например 3 × 10.",
        create: () => ({
            id: nextBlockId(),
            title: "",
            items: [createPendingItem({ kind: "reps", value: 10 })],
            rounds: 3,
            order: "sequential",
            restBetweenRounds: 60,
        }),
    },
    {
        id: "circuit",
        title: "Круговая",
        description: "Несколько упражнений подряд, потом всё сначала.",
        create: () => ({
            id: nextBlockId(),
            title: "",
            items: [
                createPendingItem({ kind: "reps", value: 10 }),
                createPendingItem({ kind: "reps", value: 10 }),
                createPendingItem({ kind: "reps", value: 10 }),
            ],
            rounds: 3,
            order: "interleaved",
            restBetweenRounds: 90,
            restBetweenSets: 0,
        }),
    },
    {
        id: "superset",
        title: "Суперсет",
        description: "Два упражнения без отдыха между ними.",
        create: () => ({
            id: nextBlockId(),
            title: "",
            items: [
                createPendingItem({ kind: "reps", value: 10 }),
                createPendingItem({ kind: "reps", value: 10 }, true),
            ],
            rounds: 3,
            order: "sequential",
            restBetweenRounds: 60,
        }),
    },
    {
        id: "amrap",
        title: "Максимум за время",
        description: "Сделать как можно больше за 10 минут (AMRAP).",
        create: () => ({
            id: nextBlockId(),
            title: "",
            items: [
                createPendingItem({
                    kind: "amrap",
                    value: 600,
                    withReps: true,
                    reps: 10,
                }),
            ],
            rounds: 1,
            order: "sequential",
        }),
    },
    {
        id: "emom",
        title: "Каждую минуту",
        description: "Новый подход каждую минуту, 10 минут (EMOM).",
        create: () => ({
            id: nextBlockId(),
            title: "",
            items: [
                createPendingItem({
                    kind: "emom",
                    value: 60,
                    withReps: true,
                    reps: 5,
                }),
            ],
            rounds: 10,
            order: "sequential",
            restBetweenRounds: 0,
        }),
    },
];

// --- Правки -----------------------------------------------------------------

export function moveInList<T>(list: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction;

    if (target < 0 || target >= list.length) {
        return list;
    }

    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

/**
 * Приводит комплекс в согласованный вид после любой правки: отдых,
 * который схеме обязателен, но у новичка вопросов не вызывает, по
 * умолчанию «без отдыха» (0) — человек может поменять; EMOM «все вместе»
 * выравнивается.
 */
export function normalizeBlock(block: ProgramBlock): ProgramBlock {
    const sets = getBlockSets(block);
    const maxRounds = Math.max(
        1,
        ...sets.map((set) =>
            hasPerSetRounds(block) ? set[0].rounds ?? block.rounds ?? 1 : block.rounds ?? 1
        )
    );

    let next: ProgramBlock = block;

    if (maxRounds > 1 && next.restBetweenRounds === undefined) {
        next = { ...next, restBetweenRounds: 0 };
    }

    if (sets.length > 1 && next.restBetweenSets === undefined) {
        next = { ...next, restBetweenSets: 0 };
    }

    return syncEmomTogether(next);
}

/** Число кругов/подходов в разумных границах или undefined. */
export function clampRounds(value: number | undefined): number | undefined {
    if (value === undefined || Number.isNaN(value)) {
        return undefined;
    }

    return Math.min(MAX_ROUNDS, Math.max(1, Math.floor(value)));
}

/**
 * Первый сет с несколькими упражнениями получает собственное число
 * подходов, когда сетов становится несколько (при «по очереди» оно
 * у каждого сета своё): без этого у нового сета не было бы числа.
 */
export function ensureSetRounds(block: ProgramBlock): ProgramBlock {
    if (!hasPerSetRounds(block)) {
        return block;
    }

    const starts = new Set<number>();
    let index = 0;

    for (const set of getBlockSets(block)) {
        starts.add(index);
        index += set.length;
    }

    return {
        ...block,
        items: block.items.map((item, itemIndex) =>
            starts.has(itemIndex) && item.rounds === undefined
                ? { ...item, rounds: block.rounds }
                : item
        ),
    };
}

// --- Подписи и проверка -----------------------------------------------------

/** Плашка нагрузки упражнения: «10 повторений», «Максимум», «AMRAP: 10 минут · ≈10 повт.». */
export function describeTargetChip(
    target: ProgramItemTarget | undefined
): string {
    const base = formatTarget(target);

    if (!base) {
        return "Задайте нагрузку";
    }

    if (
        target &&
        target.reps &&
        (target.kind === "amrap" ||
            target.kind === "emom" ||
            (target.kind === "seconds" && target.withReps))
    ) {
        return `${base} · ≈${target.reps} повт.`;
    }

    return base;
}

/** Комплексы без ещё не выбранных упражнений; пустые комплексы выбрасываются. */
export function stripPendingItems(blocks: ProgramBlock[]): ProgramBlock[] {
    return blocks
        .map((block) => ({
            ...block,
            items: block.items.filter((item) => !isPendingItem(item)),
        }))
        .filter((block) => block.items.length > 0);
}

export function composerScheme(blocks: ProgramBlock[]): ProgramScheme {
    return {
        id: "composer",
        name: "",
        mode: "auto",
        blocks,
    };
}

/**
 * Чего не хватает схеме. Правила — те же, что у схем программ
 * (getAutoSchemeProblems), плюс: не выбранное упражнение — это
 * недоделанный комплекс.
 */
export function getComposerProblems(blocks: ProgramBlock[]): string[] {
    const problems: string[] = [];

    blocks.forEach((block, index) => {
        if (block.items.some(isPendingItem)) {
            problems.push(
                `${block.title.trim() || `Комплекс ${index + 1}`}: выберите упражнение или уберите пустую строку`
            );
        }
    });

    if (problems.length > 0) {
        return problems;
    }

    return getAutoSchemeProblems(composerScheme(stripPendingItems(blocks)));
}
