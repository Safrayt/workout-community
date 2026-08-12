export type EventDateRangeFilter =
    | "today"
    | "tomorrow"
    | "week"
    | "month"
    | "all";

export type EventStatusFilter =
    | "upcoming"
    | "completed";

export type EventFilterState = {

    dateRange: EventDateRangeFilter;

    status: EventStatusFilter;

};

/**
 * Дефолтное состояние фильтров страницы «События» (UX §19): статус
 * "Предстоящие" выбран по умолчанию, т.к. это соответствует основной
 * задаче страницы — показать, где и когда люди тренируются дальше.
 *
 * Фильтров по городу и площадке нет намеренно — с ростом числа
 * площадок поиск по географии переносится на карту событий.
 */
export const defaultEventFilters: EventFilterState = {
    dateRange: "all",
    status: "upcoming",
};
