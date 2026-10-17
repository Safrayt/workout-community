import { isArticleCategory } from "../constants/articleCategories";
import { normalizeArticleTag } from "./articleTags";

import type { ArticleCategory } from "../types/article";

export type ArticleFilterState = {
    /** Одна направленность или null — любая. */
    category: ArticleCategory | null;

    /** Выбранные хештеги; несколько — "И". */
    tags: string[];

    /** Номер страницы списка, с единицы. */
    page: number;

    /** Показать черновики вместо опубликованных (только администратору). */
    drafts: boolean;
};

export const emptyArticleFilters: ArticleFilterState = {
    category: null,
    tags: [],
    page: 1,
    drafts: false,
};

/**
 * Фильтры живут в адресе страницы (?category=nutrition&tag=белок&tag=сон&page=2),
 * как у упражнений: они переживают переход на статью и возврат назад, а
 * на отфильтрованный список можно дать ссылку.
 */
export function parseArticleFilters(
    searchParams: URLSearchParams
): ArticleFilterState {
    const category = searchParams.get("category");

    const tags: string[] = [];

    for (const raw of searchParams.getAll("tag")) {
        const result = normalizeArticleTag(raw);

        if (result.ok && !tags.includes(result.tag)) {
            tags.push(result.tag);
        }
    }

    const page = Number.parseInt(searchParams.get("page") ?? "", 10);

    return {
        category: isArticleCategory(category) ? category : null,
        tags,
        page: Number.isFinite(page) && page >= 1 ? page : 1,
        drafts: searchParams.get("drafts") === "1",
    };
}

/** Записывает фильтры в копию параметров адреса, не трогая чужие параметры. */
export function writeArticleFilters(
    searchParams: URLSearchParams,
    filters: ArticleFilterState
): URLSearchParams {
    const next = new URLSearchParams(searchParams);

    next.delete("category");
    next.delete("tag");
    next.delete("page");
    next.delete("drafts");

    if (filters.category) {
        next.set("category", filters.category);
    }

    for (const tag of filters.tags) {
        next.append("tag", tag);
    }

    if (filters.page > 1) {
        next.set("page", String(filters.page));
    }

    if (filters.drafts) {
        next.set("drafts", "1");
    }

    return next;
}

export function hasActiveArticleFilters(filters: ArticleFilterState) {
    return filters.category !== null || filters.tags.length > 0;
}
