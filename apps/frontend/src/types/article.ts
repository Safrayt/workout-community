/**
 * Направленность статьи (см. constants/articleCategories.ts). Ключи те же,
 * что в ArticleCategory на бэкенде (app/models_article.py).
 */
export type ArticleCategory =
    | "training"
    | "nutrition"
    | "recovery"
    | "interview"
    | "community";

/** Статья в списке: без текста, чтобы список оставался лёгким. */
export type ArticleListItem = {
    /** Слаг — он же адрес страницы /knowledge/articles/<id>. */
    id: string;
    title: string;

    /** Краткое описание под заголовком в карточке. */
    summary: string;
    category: ArticleCategory;

    /** Хештеги без "#": в нижнем регистре, слова через дефис. */
    tags: string[];

    /** Обложка: полный адрес для <img>. */
    coverUrl?: string;

    /** Пусто, если автора уже нет (аккаунт удалён). */
    authorNickname?: string;

    /** Черновики видит только администратор. */
    isPublished: boolean;

    /** ISO-дата первой публикации (UTC, с суффиксом Z). У черновика, который ещё не публиковали, её нет. */
    publishedAt?: string;
    readingMinutes: number;
};

export type Article = ArticleListItem & {
    /**
     * Текст в Markdown. Адреса загруженных картинок в нём относительные
     * (/uploads/articles/…) — полный адрес им даёт MarkdownContent.
     */
    body: string;

    /**
     * Адрес обложки в том виде, в каком он хранится (/uploads/articles/…):
     * форма редактирования отправляет его обратно как есть. coverUrl —
     * тот же файл, но с адресом бэкенда, для показа.
     */
    coverPath?: string;
    createdAt: string;
    updatedAt: string;
};

/** Одна страница списка статей. */
export type ArticleListPage = {
    items: ArticleListItem[];
    total: number;
    page: number;
    pageSize: number;
};

export type ArticleTagCount = {
    tag: string;
    count: number;
};

/** Статья в том виде, в каком её отправляет форма. */
export type NewArticle = {
    title: string;
    summary: string;
    body: string;

    /** Пока не выбрана — пустая строка. */
    category: ArticleCategory | "";
    tags: string[];

    /** Относительный адрес обложки (/uploads/articles/…) или null. */
    coverUrl: string | null;
    isPublished: boolean;
};
