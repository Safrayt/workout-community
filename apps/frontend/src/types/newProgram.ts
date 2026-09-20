import type { ProgramDifficulty } from "./program";

/**
 * Тело для создания и редактирования "информации о программе" (п.2
 * документа) — название, описание, обложка, сложность. Структура
 * версии редактируется отдельно, через ProgramStructure (см.
 * components/ProgramStructureEditor).
 */
export type NewProgram = {
    title: string;

    description: string;

    coverUrl?: string;

    difficulty?: ProgramDifficulty;
};

export const EMPTY_NEW_PROGRAM: NewProgram = {
    title: "",
    description: "",
    coverUrl: undefined,
    difficulty: undefined,
};
