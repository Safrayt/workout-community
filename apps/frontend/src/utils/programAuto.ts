import type {
    ProgramBlock,
    ProgramBlockItem,
    ProgramItemTarget,
    ProgramScheme,
} from "../types/program";

import { pluralizeRu } from "./pluralize";

/**
 * Автоматические схемы программ: разбор сетов и подписи для экрана, а
 * также проверка, чего ещё не хватает схеме, чтобы по ней можно было
 * проходить тренировку с таймерами.
 *
 * Правила полноты те же, что в auto_scheme_problems
 * (apps/backend/app/models_program.py): редактор показывает по ним, что
 * осталось заполнить, а сервер не даёт опубликовать версию, пока список
 * не пуст. Менять только вместе.
 */

export const MAX_ROUNDS = 50;
export const MAX_REST_SECONDS = 3600;
export const MAX_TARGET_REPS = 999;
export const MAX_TARGET_SECONDS = 3600;

export function isAutoScheme(scheme: ProgramScheme): boolean {
    return scheme.mode === "auto";
}

/**
 * Сеты комплекса: подряд идущие упражнения объединяются в сет, если у
 * следующего включено «в одном сете с предыдущим»; иначе каждое
 * упражнение — отдельный сет. У первого упражнения признак не учитывается.
 */
export function getBlockSets(block: ProgramBlock): ProgramBlockItem[][] {
    const sets: ProgramBlockItem[][] = [];

    block.items.forEach((item, index) => {
        if (index === 0 || !item.groupWithPrevious) {
            sets.push([item]);
            return;
        }

        sets[sets.length - 1].push(item);
    });

    return sets;
}

export function hasSupersets(block: ProgramBlock): boolean {
    return getBlockSets(block).some((set) => set.length > 1);
}

/**
 * Повторения комплекса — «круги» (а не «подходы»): при порядке «по
 * кругу» и когда единственный сет — суперсет из нескольких упражнений.
 */
export function roundsAreCircles(block: ProgramBlock): boolean {
    const sets = getBlockSets(block);

    return sets.length > 1
        ? block.order === "interleaved"
        : (sets[0]?.length ?? 0) > 1;
}

/**
 * Число подходов у каждого сета задаётся отдельно (в одном сете 2
 * подхода, в другом 4) — при нескольких сетах «по очереди». Во всех
 * остальных случаях число повторений одно на комплекс: при порядке «по
 * кругу» это число кругов, а у единственного сета — его подходы.
 */
export function hasPerSetRounds(block: ProgramBlock): boolean {
    return getBlockSets(block).length > 1 && block.order !== "interleaved";
}

/**
 * Сколько раз выполняется каждый сет. Если число не задано, у элемента
 * undefined (для проверки полноты): у сета с собственным числом
 * подходов оно берётся из первого упражнения, а если его нет — из
 * ProgramBlock.rounds.
 */
export function getSetRounds(block: ProgramBlock): (number | undefined)[] {
    const perSet = hasPerSetRounds(block);

    return getBlockSets(block).map((set) =>
        perSet ? set[0].rounds ?? block.rounds : block.rounds
    );
}

// --- Подписи -----------------------------------------------------------

export function formatDuration(totalSeconds: number): string {
    if (totalSeconds <= 0) {
        return "без отдыха";
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds} ${pluralizeRu(seconds, ["секунда", "секунды", "секунд"])}`;
    }

    if (seconds === 0) {
        return `${minutes} ${pluralizeRu(minutes, ["минута", "минуты", "минут"])}`;
    }

    return `${minutes} мин ${seconds} сек`;
}

export function formatTarget(target: ProgramItemTarget | undefined): string {
    if (!target || !target.value || target.value <= 0) {
        return "";
    }

    if (target.kind === "max") {
        return "Максимум";
    }

    if (target.kind === "reps") {
        return `${target.value} ${pluralizeRu(target.value, ["повторение", "повторения", "повторений"])}`;
    }

    return `${target.value} ${pluralizeRu(target.value, ["секунда", "секунды", "секунд"])}`;
}

/**
 * Как выполнять комплекс автоматической схемы — две строки для экрана:
 * сколько раз повторять и какой отдых. Пустые строки не возвращаются.
 */
export function describeAutoBlock(block: ProgramBlock): string[] {
    const sets = getBlockSets(block);
    const setRounds = getSetRounds(block).map((rounds) => rounds ?? 1);
    const rounds = setRounds[0] ?? 1;
    const interleaved = block.order === "interleaved";
    const hasMultiItemSet = sets.some((set) => set.length > 1);
    const sameRounds = setRounds.every((count) => count === rounds);

    const lines: string[] = [];

    const roundsWord = (count: number, kind: "подход" | "круг") =>
        kind === "подход"
            ? `${count} ${pluralizeRu(count, ["подход", "подхода", "подходов"])}`
            : `${count} ${pluralizeRu(count, ["круг", "круга", "кругов"])}`;

    // «Сет» без суперсетов — просто упражнение, так и называем.
    const unit = hasMultiItemSet ? "сете" : "упражнении";
    const units = hasMultiItemSet ? "сеты" : "упражнения";

    if (sets.length > 1 && !interleaved && sameRounds) {
        lines.push(
            `${roundsWord(rounds, "подход")} в каждом ${unit}, ${units} по очереди`
        );
    } else if (sets.length > 1 && !interleaved) {
        // У сетов разное число подходов — перечисляем каждый.
        lines.push(
            "По очереди: " +
                setRounds
                    .map(
                        (count, index) =>
                            `${hasMultiItemSet ? "сет" : "упражнение"} ${index + 1} — ${roundsWord(count, "подход")}`
                    )
                    .join("; ")
        );
    } else if (sets.length > 1) {
        lines.push(`${roundsWord(rounds, "круг")}: ${units} друг за другом`);
    } else if (hasMultiItemSet) {
        lines.push(roundsWord(rounds, "круг"));
    } else {
        lines.push(roundsWord(rounds, "подход"));
    }

    const rests: string[] = [];
    const roundsAreCircles = interleaved || (sets.length === 1 && hasMultiItemSet);

    if (Math.max(...setRounds) > 1 && block.restBetweenRounds !== undefined) {
        rests.push(
            `между ${roundsAreCircles ? "кругами" : "подходами"} — ${formatDuration(block.restBetweenRounds)}`
        );
    }

    if (sets.length > 1 && block.restBetweenSets !== undefined) {
        rests.push(
            `между ${hasMultiItemSet ? "сетами" : "упражнениями"} — ${formatDuration(block.restBetweenSets)}`
        );
    }

    if (hasMultiItemSet && block.restWithinSet) {
        rests.push(`внутри сета — ${formatDuration(block.restWithinSet)}`);
    }

    if (block.restAfterBlock) {
        rests.push(`после комплекса — ${formatDuration(block.restAfterBlock)}`);
    }

    if (rests.length > 0) {
        lines.push(`Отдых: ${rests.join("; ")}`);
    }

    return lines;
}

// --- Проверка полноты ----------------------------------------------------

/**
 * Чего не хватает автоматической схеме. Пустой список — схема готова к
 * прохождению. У свободной схемы проверять нечего.
 */
export function getAutoSchemeProblems(scheme: ProgramScheme): string[] {
    if (!isAutoScheme(scheme)) {
        return [];
    }

    if (!scheme.blocks.some((block) => block.items.length > 0)) {
        return ["Добавьте хотя бы один комплекс с упражнениями"];
    }

    const problems: string[] = [];

    scheme.blocks.forEach((block, blockIndex) => {
        const title = block.title.trim() || `Комплекс ${blockIndex + 1}`;

        if (block.items.length === 0) {
            problems.push(`${title}: нет упражнений`);
            return;
        }

        if (block.items.some((item) => !item.target?.value)) {
            problems.push(
                `${title}: у каждого упражнения нужно указать повторения, секунды или максимум`
            );
        }

        if (
            block.items.some(
                (item) => item.target?.withReps && !item.target.reps
            )
        ) {
            problems.push(
                `${title}: у упражнения с подсчётом повторений укажите их ориентировочное число`
            );
        }

        const setRounds = getSetRounds(block);

        if (setRounds.some((rounds) => !rounds)) {
            problems.push(`${title}: укажите число подходов или кругов`);
        }

        if (
            Math.max(...setRounds.map((rounds) => rounds ?? 1)) > 1 &&
            block.restBetweenRounds === undefined
        ) {
            problems.push(
                `${title}: укажите отдых между подходами или кругами (можно 0)`
            );
        }

        if (getBlockSets(block).length > 1 && block.restBetweenSets === undefined) {
            problems.push(`${title}: укажите отдых между сетами (можно 0)`);
        }
    });

    return problems;
}
