export type ComplexType =
    | "ladder"
    | "circuit"
    | "sets"; // «Подходы»

export type MovementType =
    | "pull" // Тяга
    | "press" // Жим
    | "legs"; // Ноги

export type DifficultyTier =
    | "iron" // Чугун
    | "steel" // Сталь
    | "titanium"; // Титан

export type MetricType =
    | "time"
    | "reps"
    | "sets"
    | "rounds"
    | "duration"
    | "count";

export type ComparisonOperator = "lte" | "gte" | "eq";

export type StarCondition = {

    stars: number;

    metric: MetricType;

    operator: ComparisonOperator;

    value: number;

    unit: string;

};

/**
 * Один комплекс из каталога. Каталог статичный и приходит с бэкенда
 * целиком (GET /complexes) — пользователи не создают комплексы сами
 * (см. UX-документ «Система стандартных комплексов», п.35).
 *
 * Конкретное упражнение зашито в сложность комплекса — один и тот же
 * "сюжет" на разных уровнях сложности (Чугун/Сталь/Титан) — это
 * разные записи каталога с разными id, а не варианты одной записи.
 * Поэтому здесь нет выбора нагрузки — только теги движений для
 * фильтра каталога (movements) и сама сложность (difficulty).
 */
export type Complex = {

    id: string;

    name: string;

    type: ComplexType;

    description: string;

    schemeDisplay: string;

    schemeSteps?: number[];

    totalReps?: number;

    movements: MovementType[];

    /**
     * Конкретное упражнение, зашитое в эту сложность (например,
     * «Австралийские подтягивания» для Чугуна той же лесенки, где
     * Сталь — «Подтягивания», а Титан — «Выходы силой»).
     */
    exercise: string;

    difficulty: DifficultyTier;

    /** Какие показатели нужны для отметки выполнения этого комплекса. */
    resultMetrics: MetricType[];

    /** Условия 2 и 3 звёзд. 1 звезда — сам факт фиксации выполнения. */
    starConditions: StarCondition[];

    instructions?: string;

    restrictions?: string;

};
