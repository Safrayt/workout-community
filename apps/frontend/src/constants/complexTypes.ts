import type {
    ComplexType,
    MetricType,
    MovementType,
} from "../types/complex";

export const complexTypeLabels: Record<ComplexType, string> = {
    ladder: "Лесенка",
    circuit: "Круги",
    sets: "Подходы",
    superset: "Суперсеты",
    dropset: "Дропсеты",
    emom: "Минутки (EMOM)",
    amrap: "На время (AMRAP)",
};

export const complexTypeFilterOptions: { value: ComplexType; label: string }[] = [
    { value: "sets", label: complexTypeLabels.sets },
    { value: "circuit", label: complexTypeLabels.circuit },
    { value: "ladder", label: complexTypeLabels.ladder },
    { value: "superset", label: complexTypeLabels.superset },
    { value: "dropset", label: complexTypeLabels.dropset },
    { value: "emom", label: complexTypeLabels.emom },
    { value: "amrap", label: complexTypeLabels.amrap },
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
