export type ComplexType =
    | "ladder" // Лесенка
    | "circuit" // Круги
    | "sets" // Подходы
    | "superset" // Суперсеты
    | "dropset" // Дропсеты
    | "emom" // Минутки (EMOM)
    | "amrap"; // На время (AMRAP)

export type MovementType =
    | "pull" // Тяга
    | "press" // Жим
    | "legs"; // Ноги

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
 * Один комплекс из каталога — приходит с бэкенда через GET /complexes.
 * Добавлять и редактировать может только администратор (см.
 * components/ComplexForm), обычные пользователи только читают и
 * отмечают выполнение.
 */
export type Complex = {

    id: string;

    name: string;

    /**
     * Один комплекс может сочетать сразу несколько форматов — например,
     * "Схема Ганнибала" одновременно и круговая, и лесенка.
     */
    types: ComplexType[];

    description: string;

    schemeDisplay: string;

    schemeSteps?: number[];

    totalReps?: number;

    movements: MovementType[];

    /**
     * Конкретное упражнение (или несколько — через это поле можно
     * описать целую схему из разных движений, см. «Схему Ганнибала»).
     */
    exercise: string;

    /** Какие показатели нужны для отметки выполнения этого комплекса. */
    resultMetrics: MetricType[];

    /** Условия 2 и 3 звёзд. 1 звезда — сам факт фиксации выполнения. */
    starConditions: StarCondition[];

    instructions?: string;

    restrictions?: string;

};
