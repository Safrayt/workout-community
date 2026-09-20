import type { ProgramDifficulty } from "../types/program";

export const programDifficultyLabels: Record<ProgramDifficulty, string> = {
    beginner: "Начальный уровень",
    intermediate: "Средний уровень",
    advanced: "Продвинутый уровень",
};

export const programDifficultyFilterOptions = (
    Object.keys(programDifficultyLabels) as ProgramDifficulty[]
).map((value) => ({ value, label: programDifficultyLabels[value] }));
