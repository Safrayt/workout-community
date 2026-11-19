import type { ComplexType, MetricType } from "./complex";
import type { SchemeBlock } from "./complexScheme";
import type { ProgramScheme } from "./program";

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

    /**
     * Схема в новом формате (как у схем программ, с помощником и
     * таймерами). Если задана, форма показывает конструктор из программ,
     * а старая схема (scheme) не отправляется. Нет — комплекс со старой
     * схемой: показывается прежний конструктор.
     */
    autoScheme?: ProgramScheme;

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
    // Новые комплексы собираются в конструкторе из программ.
    scheme: [],
    autoScheme: { id: "complex-scheme", name: "", mode: "auto", blocks: [] },
    schemeNote: "",
    resultMetrics: [],
    instructions: "",
    restrictions: "",
};
