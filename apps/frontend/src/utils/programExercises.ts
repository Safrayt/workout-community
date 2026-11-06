import type { Exercise } from "../types/exercise";
import type { ProgramBlock, ProgramScheme } from "../types/program";

/**
 * Упражнения из базы, на которые ссылаются блоки схемы, без повторов, в
 * порядке появления. «Свои» упражнения (текстом) сюда не входят — у них
 * нет мышц и страницы.
 */
export function getSchemeExerciseIds(scheme: ProgramScheme): string[] {
    const ids = new Set<string>();

    for (const block of scheme.blocks) {
        for (const item of block.items) {
            if (item.kind === "exercise") {
                ids.add(item.exerciseId);
            }
        }
    }

    return [...ids];
}

/** То же, но сами упражнения; не найденные в списке (удалены) пропускаются. */
export function getSchemeExercises(
    scheme: ProgramScheme,
    exercises: Exercise[]
): Exercise[] {
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    return getSchemeExerciseIds(scheme)
        .map((id) => byId.get(id))
        .filter((exercise): exercise is Exercise => exercise !== undefined);
}

/**
 * Упражнения блока по порядку — и из базы, и свои — одной строкой
 * каждое, с нагрузкой через тире, если она указана («Подтягивания — 80%
 * от максимума»). Для вывода текстом (например, на скачиваемой картинке
 * схемы). nameOf возвращает название упражнения из базы по id.
 */
export function getBlockExerciseNames(
    block: ProgramBlock,
    nameOf: (exerciseId: string) => string
): string[] {
    return block.items.map((item) => {
        const name = item.kind === "exercise" ? nameOf(item.exerciseId) : item.text;

        return item.load ? `${name} — ${item.load}` : name;
    });
}
