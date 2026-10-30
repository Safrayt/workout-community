import type { ComplexType, MetricType } from "../types/complex";

export const complexTypeLabels: Record<ComplexType, string> = {
    ladder: "Лесенка",
    circuit: "Круги",
    sets: "Подходы",
    superset: "Суперсеты",
    dropset: "Дропсеты",
    emom: "Минутки (EMOM)",
    amrap: "На время (AMRAP)",
    interval: "Интервальный",
};

export const complexTypeFilterOptions: { value: ComplexType; label: string }[] = [
    { value: "sets", label: complexTypeLabels.sets },
    { value: "circuit", label: complexTypeLabels.circuit },
    { value: "ladder", label: complexTypeLabels.ladder },
    { value: "superset", label: complexTypeLabels.superset },
    { value: "dropset", label: complexTypeLabels.dropset },
    { value: "emom", label: complexTypeLabels.emom },
    { value: "amrap", label: complexTypeLabels.amrap },
    { value: "interval", label: complexTypeLabels.interval },
];

export const metricLabels: Record<MetricType, string> = {
    time: "Время",
    reps: "Повторения",
    sets: "Подходы",
    rounds: "Круги",
    duration: "Продолжительность",
    count: "Значение",
};

export type PersonalStatusFilter = "" | "not-done" | "done";

export const personalStatusFilterOptions: { value: PersonalStatusFilter; label: string }[] = [
    { value: "not-done", label: "Не выполнял" },
    { value: "done", label: "Выполнял" },
];
