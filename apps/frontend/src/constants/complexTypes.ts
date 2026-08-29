import type {
    ComplexType,
    DifficultyTier,
    MetricType,
    MovementType,
} from "../types/complex";

export const complexTypeLabels: Record<ComplexType, string> = {
    ladder: "Лесенка",
    circuit: "Круговая",
    sets: "Подходы",
};

export const complexTypeFilterOptions: { value: ComplexType; label: string }[] = [
    { value: "ladder", label: complexTypeLabels.ladder },
    { value: "circuit", label: complexTypeLabels.circuit },
    { value: "sets", label: complexTypeLabels.sets },
];

export const movementLabels: Record<MovementType, string> = {
    pull: "Тяга",
    press: "Жим",
    legs: "Ноги",
};

export const movementFilterOptions: { value: MovementType; label: string }[] = [
    { value: "pull", label: movementLabels.pull },
    { value: "press", label: movementLabels.press },
    { value: "legs", label: movementLabels.legs },
];

export const difficultyLabels: Record<DifficultyTier, string> = {
    iron: "Чугун",
    steel: "Сталь",
    titanium: "Титан",
};

export const difficultyFilterOptions: { value: DifficultyTier; label: string }[] = [
    { value: "iron", label: difficultyLabels.iron },
    { value: "steel", label: difficultyLabels.steel },
    { value: "titanium", label: difficultyLabels.titanium },
];

export const metricLabels: Record<MetricType, string> = {
    time: "Время",
    reps: "Повторения",
    sets: "Подходы",
    rounds: "Круги",
    duration: "Продолжительность",
    count: "Значение",
};

export type PersonalStatusFilter = "" | "not-done" | "done" | "two-stars" | "three-stars";

export const personalStatusFilterOptions: { value: PersonalStatusFilter; label: string }[] = [
    { value: "not-done", label: "Не выполнял" },
    { value: "done", label: "Выполнял" },
    { value: "two-stars", label: "⭐⭐" },
    { value: "three-stars", label: "⭐⭐⭐" },
];
