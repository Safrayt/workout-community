/**
 * Мышечные группы карты мышц (см. constants/muscleGroups.ts). Ключ
 * один и тот же в данных упражнений, в фильтрах, в адресной строке
 * (?muscles=lats,biceps) и в фигурах силуэта (constants/muscleMapShapes.ts).
 */
export type MuscleGroupKey =
    | "pecMajor"
    | "upperChest"
    | "frontDelts"
    | "sideDelts"
    | "rearDelts"
    | "biceps"
    | "triceps"
    | "forearms"
    | "upperTrapezius"
    | "lowerTrapezius"
    | "lats"
    | "spinalErectors"
    | "abs"
    | "obliques"
    | "iliacus"
    | "glutes"
    | "quads"
    | "hamstrings"
    | "calves";

/** Тип движения (см. constants/movementTypes.ts). */
export type MovementType =
    | "pull"
    | "push"
    | "abduction"
    | "crunch"
    | "kneeDominant"
    | "hipDominant"
    | "ankleExtension";

export type Exercise = {
    id: string;
    name: string;

    /** Название на английском — показывается под заголовком страницы. */
    nameEn?: string;

    movementType: MovementType;

    /** Мышцы, на которые упражнение нацелено в первую очередь. */
    targetMuscles: MuscleGroupKey[];

    /** Мышцы, которые работают в помощь (синергисты и стабилизаторы). */
    auxiliaryMuscles: MuscleGroupKey[];

    /** Что нужно для выполнения: "Турник", "Брусья", "Без оборудования". */
    equipment: string[];

    /** Блок "Что это такое?": одно-два предложения о сути упражнения. */
    description: string;

    /** Блок "Преимущества". */
    advantages?: string[];

    /** Блок "Недостатки". */
    disadvantages?: string[];

    /** Блок "Техника выполнения": шаги по порядку (нумеруются сами). */
    technique: string[];

    /** Блок "Особенности": на что обратить внимание, как усложнить/облегчить. */
    features?: string[];

    /** Блок "Для кого подходит". */
    suitableFor?: string[];

    /**
     * Видео выполнения (вертикальное): путь от корня сайта, файл лежит в
     * public/exercises/videos/. На странице упражнения появляется
     * переключатель "Видео / Мышцы". Рекомендуется mp4 (H.264), до
     * 720×1280, 5–20 секунд.
     */
    videoUrl?: string;

    /**
     * Фото выполнения: путь от корня сайта, файл лежит в
     * public/exercises/. Если не задано, на карточке показывается
     * только схема мышц.
     */
    photoUrl?: string;
};
