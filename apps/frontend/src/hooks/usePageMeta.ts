import { useEffect } from "react";

import { applyPageMeta } from "../utils/pageMeta";

/**
 * Заголовок вкладки и описание страницы, которые зависят от данных
 * (название упражнения, комплекса, статьи и т. д.). Пока данные не
 * загрузились, передайте undefined — останется заголовок сайта.
 *
 * Заголовки страниц без данных задаются в маршрутах (handle.title в
 * app/router.tsx) и применяются в RouteMeta.
 */
export function usePageMeta(title?: string, description?: string): void {
    useEffect(() => {
        if (!title) {
            return;
        }

        return applyPageMeta({ title, description });
    }, [title, description]);
}
