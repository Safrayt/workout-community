import { resolveMediaUrl } from "../media";

import type {
    Article,
    ArticleCategory,
    ArticleListItem,
    ArticleListPage,
    ArticleTagCount,
    NewArticle,
} from "../../types/article";

/** Статья в списке так, как её отдаёт бэкенд (app/models_article.py). */
export type ApiArticleListItem = {
    id: string;
    title: string;
    summary: string;
    category: ArticleCategory;
    tags: string[];
    cover_url: string | null;
    author_nickname: string | null;
    is_published: boolean;
    published_at: string | null;
    reading_minutes: number;
};

export type ApiArticle = ApiArticleListItem & {
    body: string;
    created_at: string;
    updated_at: string;
};

export type ApiArticleListResponse = {
    items: ApiArticleListItem[];
    total: number;
    page: number;
    page_size: number;
};

export type ApiArticleTagCount = {
    tag: string;
    count: number;
};

export function mapApiArticleListItem(api: ApiArticleListItem): ArticleListItem {
    return {
        id: api.id,
        title: api.title,
        summary: api.summary,
        category: api.category,
        tags: api.tags,
        coverUrl: resolveMediaUrl(api.cover_url),
        authorNickname: api.author_nickname ?? undefined,
        isPublished: api.is_published,
        publishedAt: api.published_at ?? undefined,
        readingMinutes: api.reading_minutes,
    };
}

export function mapApiArticle(api: ApiArticle): Article {
    return {
        ...mapApiArticleListItem(api),
        body: api.body,
        coverPath: api.cover_url ?? undefined,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
    };
}

export function mapApiArticleListPage(
    api: ApiArticleListResponse
): ArticleListPage {
    return {
        items: api.items.map(mapApiArticleListItem),
        total: api.total,
        page: api.page,
        pageSize: api.page_size,
    };
}

export function mapApiArticleTag(api: ApiArticleTagCount): ArticleTagCount {
    return { tag: api.tag, count: api.count };
}

/** Тело запроса POST/PUT. */
export function mapNewArticleToApi(article: NewArticle) {
    return {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        tags: article.tags,
        cover_url: article.coverUrl,
        is_published: article.isPublished,
    };
}
