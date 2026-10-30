import type { ComplexType, MetricType } from "./complex";
import { createEmptySchemeBlock, type SchemeBlock } from "./complexScheme";

/**
 * Форма создания/редактирования комплекса (доступно только
 * администратору, см. components/ComplexForm).
 */
export type NewComplex = {
    id: string;
    name: string;
    types: ComplexType[];
    description: string;

    /**
     * Схема: блоки с упражнениями из базы упражнений. Список разных
     * упражнений комплекса (exerciseIds) и текст "Упражнение(я)" сервер
     * выводит из неё сам.
     */
    scheme: SchemeBlock[];

    /** Пояснение к схеме целиком (необязательно). */
    schemeNote: string;

    resultMetrics: MetricType[];
    instructions: string;
    restrictions: string;
};

export const EMPTY_NEW_COMPLEX: NewComplex = {
    id: "",
    name: "",
    types: [],
    description: "",
    // Один пустой блок, чтобы форма сразу была готова к вводу.
    scheme: [createEmptySchemeBlock()],
    schemeNote: "",
    resultMetrics: [],
    instructions: "",
    restrictions: "",
};
