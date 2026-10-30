import type { Params, UIMatch } from "react-router-dom";

/**
 * Какие провайдеры нужны странице, когда её открыл гость.
 *
 * Для вошедшего пользователя ProtectedLayout монтирует полный набор
 * провайдеров. Гостю все они не нужны (а часть рассчитана на наличие
 * пользователя), поэтому публичная страница заранее объявляет, что
 * именно ей требуется.
 */
export type GuestProviderGroup =
    | "playgrounds"
    | "playground"
    | "events"
    | "exercises"
    | "exercise"
    | "complexes"
    | "complex"
    | "programs"
    | "program";

/**
 * Поле handle маршрута. Наличие guest делает страницу доступной без
 * входа; guest: [] — публичная страница, которой провайдеры не нужны
 * (например, статьи: они грузятся напрямую через api/articles).
 *
 * Публичность задаётся именно на маршруте, а не списком путей: так
 * её определяет сам роутер по тому маршруту, который реально
 * сработал. Список строк или регулярка по pathname спутали бы
 * "/events/create" (только для вошедших) с "/events/:id" (публичная).
 */
export type RouteHandle = {
    guest?: GuestProviderGroup[];

    /**
     * Название страницы — заголовок вкладки и результата поиска (к нему
     * добавляется название сайта). Функция — если название зависит от
     * адреса, например от ника в /u/:username. У страниц, чей заголовок
     * зависит от загруженных данных (упражнение, комплекс, статья…),
     * title не задают: они ставят его сами через usePageMeta.
     */
    title?: string | ((params: Params<string>) => string);

    /** Описание страницы для поисковой выдачи (<meta name="description">). */
    description?: string;
};

/**
 * null — страница требует входа. Иначе — список групп провайдеров,
 * которые нужно смонтировать гостю (может быть пустым).
 */
export function getGuestProviderGroups(
    matches: UIMatch[]
): GuestProviderGroup[] | null {
    let groups: GuestProviderGroup[] | null = null;

    for (const match of matches) {
        const handle = match.handle as RouteHandle | undefined;

        if (handle?.guest) {
            groups = [...(groups ?? []), ...handle.guest];
        }
    }

    return groups;
}
