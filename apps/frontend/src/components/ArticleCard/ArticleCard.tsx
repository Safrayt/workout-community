import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import TagBadge from "../ui/TagBadge/TagBadge";

import "../../styles/components/article-card.css";

import type { ArticleListItem } from "../../types/article";

import {
    articleCategoryColors,
    articleCategoryLabels,
} from "../../constants/articleCategories";
import { formatDate } from "../../utils/formatDate";

type ArticleCardProps = {
    article: ArticleListItem;

    /**
     * Строка запроса списка (фильтры и страница). Передаётся странице
     * статьи, чтобы "← К списку статей" вернуло с теми же фильтрами.
     */
    listSearch: string;

    /** Клик по хештегу карточки добавляет его в фильтр. */
    onTagClick: (tag: string) => void;
};

/**
 * Карточка статьи в списке. Открывают статью название и картинка (это
 * ссылки), а хештеги — отдельные кнопки фильтра, поэтому вся карточка
 * целиком ссылкой не сделана: кнопка внутри ссылки — невалидная
 * разметка.
 */
export default function ArticleCard({
    article,
    listSearch,
    onTagClick,
}: ArticleCardProps) {
    const {
        id,
        title,
        summary,
        category,
        tags,
        coverUrl,
        authorNickname,
        isPublished,
        publishedAt,
        readingMinutes,
    } = article;

    const path = `/knowledge/articles/${id}`;
    const categoryLabel = articleCategoryLabels[category];

    const meta = [
        publishedAt ? formatDate(publishedAt) : "Не опубликована",
        readingMinutes > 0 ? `${readingMinutes} мин чтения` : null,
        authorNickname ?? null,
    ].filter(Boolean);

    return (
        <Card
            className="article-card"
            style={
                {
                    "--category-color": articleCategoryColors[category],
                } as CSSProperties
            }
        >
            <Link
                to={path}
                state={{ listSearch }}
                className="article-card__media"
                tabIndex={-1}
                aria-hidden="true"
            >
                {coverUrl ? (
                    <img
                        className="article-card__cover"
                        src={coverUrl}
                        alt=""
                        loading="lazy"
                    />
                ) : (
                    <span className="article-card__placeholder">
                        {categoryLabel}
                    </span>
                )}
            </Link>

            <div className="article-card__body">
                <div className="article-card__badges">
                    <span className="article-card__category">
                        {categoryLabel}
                    </span>

                    {!isPublished && (
                        <span className="article-card__draft">Черновик</span>
                    )}
                </div>

                <h3 className="article-card__title">
                    <Link to={path} state={{ listSearch }}>
                        {title}
                    </Link>
                </h3>

                {summary && <p className="article-card__summary">{summary}</p>}

                <p className="article-card__meta">{meta.join(" · ")}</p>

                {tags.length > 0 && (
                    <div className="tag-list article-card__tags">
                        {tags.map((tag) => (
                            <TagBadge
                                key={tag}
                                label={`#${tag}`}
                                onClick={() => onTagClick(tag)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
