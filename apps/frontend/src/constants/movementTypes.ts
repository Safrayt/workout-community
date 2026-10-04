import type { MovementType } from "../types/exercise";

export type MovementTypeInfo = {
    key: MovementType;
    label: string;

    /**
     * Цвет типа движения: полоска и бейдж на карточке упражнения,
     * кнопка фильтра. Цвета подобраны так, чтобы различаться между
     * собой и читаться белым текстом на заливке; зелёного нет —
     * он занят выбранным состоянием по всему сайту.
     */
    color: string;
};

export const movementTypes: MovementTypeInfo[] = [
    { key: "pull", label: "Тяговые", color: "#3182ce" },
    { key: "push", label: "Жимовые", color: "#dd6b20" },
    { key: "abduction", label: "Отведения", color: "#805ad5" },
    { key: "crunch", label: "Скручивания", color: "#b7791f" },
    { key: "kneeDominant", label: "Колено-доминантные", color: "#2c7a7b" },
    { key: "hipDominant", label: "Тазо-доминантные", color: "#b83280" },
    { key: "ankleExtension", label: "Разгибание стопы", color: "#4a5568" },
];

export const movementTypeLabels = Object.fromEntries(
    movementTypes.map((type) => [type.key, type.label])
) as Record<MovementType, string>;

export const movementTypeColors = Object.fromEntries(
    movementTypes.map((type) => [type.key, type.color])
) as Record<MovementType, string>;

export const movementTypeKeys = movementTypes.map((type) => type.key);
