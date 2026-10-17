import type { Article, NewArticle } from "../types/article";

/** Должны совпадать с MAX_TITLE_LENGTH, MAX_SUMMARY_LENGTH и MAX_BODY_LENGTH в app/models_article.py. */
export const MAX_ARTICLE_TITLE_LENGTH = 150;
export const MAX_ARTICLE_SUMMARY_LENGTH = 300;
export const MAX_ARTICLE_BODY_LENGTH = 100_000;

export const emptyArticle: NewArticle = {
    title: "",
    summary: "",
    body: "",
    category: "",
    tags: [],
    coverUrl: null,
    isPublished: false,
};

export function articleToFormValue(article: Article): NewArticle {
    return {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        tags: article.tags,
        coverUrl: article.coverPath ?? null,
        isPublished: article.isPublished,
    };
}

/**
 * Совпадает ли содержимое двух статей. Флаг isPublished не сравнивается:
 * его ставит не ввод, а кнопка сохранения ("Опубликовать" / "Сохранить
 * черновик"), поэтому он не считается правкой текста.
 */
export function isSameArticleContent(a: NewArticle, b: NewArticle): boolean {
    return (
        a.title === b.title &&
        a.summary === b.summary &&
        a.body === b.body &&
        a.category === b.category &&
        a.coverUrl === b.coverUrl &&
        a.tags.length === b.tags.length &&
        a.tags.every((tag, index) => tag === b.tags[index])
    );
}

export type ArticleFormErrors = {
    title?: string;
    category?: string;
    summary?: string;
    body?: string;
};

/**
 * Проверка формы (те же правила, что у ArticleWrite на бэкенде).
 * Черновик можно сохранить с одним названием и направленностью, а при
 * публикации нужны ещё краткое описание и текст.
 */
export function validateArticleForm(value: NewArticle): ArticleFormErrors {
    const errors: ArticleFormErrors = {};

    if (!value.title.trim()) {
        errors.title = "Укажите название статьи";
    } else if (value.title.trim().length > MAX_ARTICLE_TITLE_LENGTH) {
        errors.title = `Название не длиннее ${MAX_ARTICLE_TITLE_LENGTH} символов`;
    }

    if (!value.category) {
        errors.category = "Выберите направленность";
    }

    if (value.summary.trim().length > MAX_ARTICLE_SUMMARY_LENGTH) {
        errors.summary = `Краткое описание не длиннее ${MAX_ARTICLE_SUMMARY_LENGTH} символов`;
    } else if (value.isPublished && !value.summary.trim()) {
        errors.summary = "Чтобы опубликовать статью, добавьте краткое описание";
    }

    if (value.body.trim().length > MAX_ARTICLE_BODY_LENGTH) {
        errors.body = `Текст не длиннее ${MAX_ARTICLE_BODY_LENGTH.toLocaleString("ru-RU")} символов`;
    } else if (value.isPublished && !value.body.trim()) {
        errors.body = "Чтобы опубликовать статью, добавьте текст";
    }

    return errors;
}

/** "16.10.2026, 14:32" — когда редактор сохранил копию (местное время читателя). */
export function formatDraftTime(isoString: string): string {
    return new Date(isoString).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
