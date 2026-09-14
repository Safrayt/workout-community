import type {
    ComplexType,
    MetricType,
    MovementType,
    StarCondition,
} from "./complex";

/**
 * Форма создания/редактирования комплекса (доступно только
 * администратору, см. components/ComplexForm).
 */
export type NewComplex = {
    id: string;
    name: string;
    types: ComplexType[];
    description: string;
    schemeDisplay: string;
    schemeSteps: number[] | null;
    totalReps: number | null;
    movements: MovementType[];
    exercise: string;
    resultMetrics: MetricType[];
    starConditions: StarCondition[];
    instructions: string;
    restrictions: string;
};

export const EMPTY_NEW_COMPLEX: NewComplex = {
    id: "",
    name: "",
    types: [],
    description: "",
    schemeDisplay: "",
    schemeSteps: null,
    totalReps: null,
    movements: [],
    exercise: "",
    resultMetrics: [],
    starConditions: [],
    instructions: "",
    restrictions: "",
};
