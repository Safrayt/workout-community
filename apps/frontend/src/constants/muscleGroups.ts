import type { MuscleGroupKey } from "../types/exercise";

export type MuscleGroupInfo = {
    key: MuscleGroupKey;

    /** Короткое название — на кнопках фильтра и в списках. */
    label: string;

    /** Полное название, если группа объединяет несколько мышц. */
    fullName?: string;
};

/**
 * Мышечные группы в порядке показа в фильтре: сверху вниз по телу —
 * грудь, плечи, руки, спина, корпус, ноги. Названия — как в макете
 * "Атлас мышц", кроме "Верха груди": в макете эта группа называлась
 * "Малые грудные", но фигуры лежат вдоль ключицы, а малая грудная
 * мышца находится под большой и снаружи не видна.
 *
 * Подвздошная мышца — тоже глубокая (лежит внутри таза, снаружи не
 * видна), но в отличие от малой грудной её работа в упражнениях
 * важна сама по себе: она главный сгибатель бедра (подъёмы ног и
 * коленей). Поэтому группа есть, а на силуэте показана условно —
 * как проекция на паховую складку (см. muscleMapShapes.ts).
 */
export const muscleGroups: MuscleGroupInfo[] = [
    { key: "pecMajor", label: "Большие грудные" },
    {
        key: "upperChest",
        label: "Верх груди",
        fullName: "Верхняя часть грудных мышц",
    },
    { key: "frontDelts", label: "Передние дельты" },
    { key: "sideDelts", label: "Средние дельты" },
    { key: "rearDelts", label: "Задние дельты" },
    { key: "biceps", label: "Бицепсы" },
    { key: "triceps", label: "Трицепсы" },
    { key: "forearms", label: "Предплечья" },
    { key: "upperTrapezius", label: "Верх трапеций" },
    { key: "lowerTrapezius", label: "Низ трапеций" },
    {
        key: "lats",
        label: "Широчайшие",
        fullName: "Широчайшие, ромбовидные и круглые мышцы",
    },
    { key: "spinalErectors", label: "Разгибатели спины" },
    { key: "abs", label: "Пресс" },
    {
        key: "obliques",
        label: "Косые мышцы",
        fullName: "Косые мышцы живота и зубчатые мышцы",
    },
    {
        key: "iliacus",
        label: "Подвздошная мышца",
        fullName: "Подвздошная мышца — глубокий сгибатель бедра",
    },
    { key: "glutes", label: "Ягодицы" },
    { key: "quads", label: "Четырёхглавые" },
    { key: "hamstrings", label: "Задняя поверхность бёдер" },
    { key: "calves", label: "Икры" },
];

export const muscleGroupLabels = Object.fromEntries(
    muscleGroups.map((group) => [group.key, group.label])
) as Record<MuscleGroupKey, string>;

export const muscleGroupKeys = muscleGroups.map((group) => group.key);
