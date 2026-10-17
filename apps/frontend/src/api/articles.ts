import { apiFetch } from "./client";
import {
    mapApiArticle,
    mapApiArticleListPage,
    mapApiArticleTag,
    mapNewArticleToApi,
    type ApiArticle,
    type ApiArticleListResponse,
    type ApiArticleTagCount,
} from "./mappers/article";

import type {
    Article,
    ArticleCategory,
    ArticleListPage,
    ArticleTagCount,
    NewArticle,
} from "../types/article";

export type ListArticlesParams = {
    category?: ArticleCategory | null;

    /** Несколько тегов — "И": нужны статьи, у которых есть все. */
    tags?: string[];
    page?: number;
    pageSize?: number;

    /** Черновики вместо опубликованных — только для администратора. */
    drafts?: boolean;
};

export async function listArticles(
    params: ListArticlesParams = {}
): Promise<ArticleListPage> {
    const search = new URLSearchParams();

    if (params.category) {
        search.set("category", params.category);
    }

    for (const tag of params.tags ?? []) {
        search.append("tag", tag);
    }

    if (params.page) {
        search.set("page", String(params.page));
    }

    if (params.pageSize) {
        search.set("page_size", String(params.pageSize));
    }

    if (params.drafts) {
        search.set("status", "draft");
    }

    const query = search.toString();

    const api = await apiFetch<ApiArticleListResponse>(
        `/articles/${query ? `?${query}` : ""}`
    );

    return mapApiArticleListPage(api);
}

/** Частые хештеги опубликованных статей — для облака тегов. */
export async function listArticleTags(
    category?: ArticleCategory | null
): Promise<ArticleTagCount[]> {
    const query = category ? `?category=${category}` : "";

    const api = await apiFetch<ApiArticleTagCount[]>(`/articles/tags${query}`);

    return api.map(mapApiArticleTag);
}

export async function getArticle(id: string): Promise<Article> {
    const api = await apiFetch<ApiArticle>(
        `/articles/${encodeURIComponent(id)}`
    );

    return mapApiArticle(api);
}

/**
 * Всё, что ниже, — только для администратора (403 от бэкенда для
 * остальных, см. ensure_admin в app/routers/articles.py). Кнопки в
 * интерфейсе скрыты от остальных, но источник правды по правам — сервер.
 */
export async function createArticle(data: NewArticle): Promise<Article> {
    const api = await apiFetch<ApiArticle>("/articles/", {
        method: "POST",
        body: mapNewArticleToApi(data),
    });

    return mapApiArticle(api);
}

export async function updateArticle(
    id: string,
    data: NewArticle
): Promise<Article> {
    const api = await apiFetch<ApiArticle>(
        `/articles/${encodeURIComponent(id)}`,
        { method: "PUT", body: mapNewArticleToApi(data) }
    );

    return mapApiArticle(api);
}

export async function deleteArticle(id: string): Promise<void> {
    await apiFetch<void>(`/articles/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

/**
 * Загружает картинку для текста или обложки статьи и возвращает её
 * относительный адрес (/uploads/articles/…) — именно он сохраняется в
 * статье; полный адрес для показа строит resolveMediaUrl.
 */
export async function uploadArticleImage(file: File): Promise<string> {
    const formData = new FormData();

    formData.append("file", file);

    const response = await apiFetch<{ url: string }>("/articles/images", {
        method: "POST",
        body: formData,
    });

    return response.url;
}
