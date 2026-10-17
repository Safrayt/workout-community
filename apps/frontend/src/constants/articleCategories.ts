import type { ArticleCategory } from "../types/article";

export type ArticleCategoryInfo = {
    key: ArticleCategory;
    label: string;

    /**
     * Цвет направленности: бейдж на карточке и странице статьи. Как и у
     * типов движения (constants/movementTypes.ts), зелёного нет — он
     * занят выбранным состоянием по всему сайту.
     */
    color: string;
};

/**
 * Список направленностей статей. Чтобы добавить новую, нужно добавить её
 * ключ в ArticleCategory (types/article.ts) и сюда, а на бэкенде — в
 * ArticleCategory в app/models_article.py (иначе сервер её не примет).
 */
export const articleCategories: ArticleCategoryInfo[] = [
    { key: "training", label: "Тренировки", color: "#3182ce" },
    { key: "nutrition", label: "Питание", color: "#dd6b20" },
    { key: "recovery", label: "Восстановление", color: "#805ad5" },
    { key: "interview", label: "Интервью", color: "#b83280" },
    { key: "community", label: "Сообщество", color: "#2c7a7b" },
];

export const articleCategoryLabels = Object.fromEntries(
    articleCategories.map((category) => [category.key, category.label])
) as Record<ArticleCategory, string>;

export const articleCategoryColors = Object.fromEntries(
    articleCategories.map((category) => [category.key, category.color])
) as Record<ArticleCategory, string>;

export function isArticleCategory(
    value: string | null | undefined
): value is ArticleCategory {
    return articleCategories.some((category) => category.key === value);
}
