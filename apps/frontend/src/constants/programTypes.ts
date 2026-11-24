import type { ProgramCategory, ProgramDifficulty } from "../types/program";

export const programDifficultyLabels: Record<ProgramDifficulty, string> = {
    beginner: "Начальный уровень",
    intermediate: "Средний уровень",
    advanced: "Продвинутый уровень",
};

export const programDifficultyFilterOptions = (
    Object.keys(programDifficultyLabels) as ProgramDifficulty[]
).map((value) => ({ value, label: programDifficultyLabels[value] }));

/** Категория программы по умолчанию — как на сервере: так же называется
 *  категория у всех программ, созданных до появления категорий. */
export const DEFAULT_PROGRAM_CATEGORY: ProgramCategory = "personal";

export const programCategoryLabels: Record<ProgramCategory, string> = {
    public: "Публичная",
    personal: "Личная",
};

/** Пояснение к категории — в форме создания и редактирования программы. */
export const programCategoryDescriptions: Record<ProgramCategory, string> = {
    public: "создана для других участников сообщества",
    personal: "автор сам тренируется по ней",
};

export const programCategoryFilterOptions = (
    Object.keys(programCategoryLabels) as ProgramCategory[]
).map((value) => ({ value, label: programCategoryLabels[value] }));

export const programCategoryFormOptions = (
    Object.keys(programCategoryLabels) as ProgramCategory[]
).map((value) => ({
    value,
    label: `${programCategoryLabels[value]} — ${programCategoryDescriptions[value]}`,
}));
