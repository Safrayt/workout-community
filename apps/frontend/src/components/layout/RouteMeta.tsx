import { useEffect } from "react";
import { useMatches } from "react-router-dom";

import type { RouteHandle } from "../../app/guestAccess";

import { applyPageMeta } from "../../utils/pageMeta";

/**
 * Заголовок вкладки и описание для страниц, чьи названия заданы в
 * маршруте (handle.title / handle.description в app/router.tsx).
 * Страницы с данными (упражнение, комплекс…) выставляют свой заголовок
 * сами — хуком usePageMeta, и в маршруте у них title нет.
 */
export default function RouteMeta() {
    const matches = useMatches();
    const last = matches[matches.length - 1];

    const handle = last?.handle as RouteHandle | undefined;

    const title =
        typeof handle?.title === "function"
            ? handle.title(last.params)
            : handle?.title;

    const description = handle?.description;

    useEffect(() => {
        if (!title) {
            return;
        }

        return applyPageMeta({ title, description });
    }, [title, description]);

    return null;
}
