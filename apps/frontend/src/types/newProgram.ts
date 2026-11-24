import type { ProgramCategory, ProgramDifficulty } from "./program";

/**
 * Тело для создания и редактирования "информации о программе" (п.2
 * документа) — название, описание, обложка, сложность, категория. Структура
 * версии редактируется отдельно, через ProgramStructure (см.
 * components/ProgramStructureEditor).
 */
export type NewProgram = {
    title: string;

    description: string;

    coverUrl?: string;

    difficulty?: ProgramDifficulty;

    category: ProgramCategory;
};

export const EMPTY_NEW_PROGRAM: NewProgram = {
    title: "",
    description: "",
    coverUrl: undefined,
    difficulty: undefined,
    // Как и у программ, созданных до появления категорий: пока автор не
    // выбрал иное, программа считается личной.
    category: "personal",
};
