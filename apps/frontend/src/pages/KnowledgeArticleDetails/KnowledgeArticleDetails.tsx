import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import TagBadge from "../../components/ui/TagBadge/TagBadge";
import LazyMarkdownContent from "../../components/MarkdownContent/LazyMarkdownContent";

import "../../styles/components/article-details.css";

import { getArticle } from "../../api/articles";
import { ApiError } from "../../api/errors";
import {
    articleCategoryColors,
    articleCategoryLabels,
} from "../../constants/articleCategories";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { formatDate } from "../../utils/formatDate";

/**
 * /knowledge/articles/:id — страница статьи: название, направленность,
 * дата, время чтения, обложка, текст и хештеги. Направленность и
 * хештеги ведут в список с этим фильтром. Администратору доступна
 * кнопка "Редактировать"; черновик других пользователей не открывается
 * вовсе (для них сервер отвечает "не найдено").
 */
export default function KnowledgeArticleDetails() {
    const { id = "" } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const { currentUser } = useCurrentUser();

    const resource = useAsyncResource(`article:${id}`, () => getArticle(id));

    // Список открывается с теми же фильтрами, с какими из него ушли
    // (карточка передаёт свою строку запроса в state).
    const listSearch =
        (location.state as { listSearch?: string } | null)?.listSearch ?? "";

    const backLink = (
        <Link
            to={{ pathname: "/knowledge/articles", search: listSearch }}
            className="article-details__back"
        >
            ← К списку статей
        </Link>
    );

    if (resource.isLoading) {
        return (
            <Section title="Статьи">
                <p>Загрузка…</p>
            </Section>
        );
    }

    if (resource.error || !resource.data) {
        const notFound =
            resource.error instanceof ApiError && resource.error.status === 404;

        return (
            <Section title="Статьи">
                <div className="article-details__not-found">
                    <p className="article-details__not-found-title">
                        {notFound
                            ? "Статья не найдена"
                            : (resource.error?.message ??
                              "Не удалось загрузить статью")}
                    </p>

                    {notFound && (
                        <p>
                            Возможно, ссылка устарела или статью убрали.
                            Вернитесь к списку и выберите статью заново.
                        </p>
                    )}

                    <div className="article-details__not-found-actions">
                        {!notFound && (
                            <Button variant="outline" onClick={resource.reload}>
                                Повторить
                            </Button>
                        )}

                        <Link to="/knowledge/articles">
                            <Button variant="outline">К списку статей</Button>
                        </Link>
                    </div>
                </div>
            </Section>
        );
    }

    const article = resource.data;

    function openList(params: Record<string, string>) {
        navigate({
            pathname: "/knowledge/articles",
            search: `?${new URLSearchParams(params).toString()}`,
        });
    }

    const meta = [
        article.publishedAt ? formatDate(article.publishedAt) : null,
        article.readingMinutes > 0
            ? `${article.readingMinutes} мин чтения`
            : null,
        article.authorNickname ?? null,
    ].filter(Boolean);

    return (
        <>
            {/* Ссылка стоит над заголовком (Section выводит заголовок
                первым, поэтому она вне Section). Справа от неё —
                "Редактировать", только для администратора. */}
            <div className="article-details__top-row">
                <p className="article-details__back-row">{backLink}</p>

                {currentUser.isAdmin && (
                    <Link to={`/knowledge/articles/${article.id}/edit`}>
                        <Button type="button" variant="outline">
                            Редактировать
                        </Button>
                    </Link>
                )}
            </div>

            <Section title={article.title}>
                <article className="article-details">
                    {!article.isPublished && (
                        <p className="article-details__draft-notice" role="status">
                            Черновик: эту статью видят только администраторы.
                        </p>
                    )}

                    <div className="article-details__meta">
                        <button
                            type="button"
                            className="article-details__category"
                            style={{
                                background:
                                    articleCategoryColors[article.category],
                            }}
                            onClick={() =>
                                openList({ category: article.category })
                            }
                        >
                            {articleCategoryLabels[article.category]}
                        </button>

                        <span className="article-details__meta-text">
                            {meta.join(" · ")}
                        </span>
                    </div>

                    {article.coverUrl && (
                        <img
                            className="article-details__cover"
                            src={article.coverUrl}
                            alt=""
                        />
                    )}

                    <LazyMarkdownContent source={article.body} />

                    {article.tags.length > 0 && (
                        <div className="tag-list article-details__tags">
                            {article.tags.map((tag) => (
                                <TagBadge
                                    key={tag}
                                    label={`#${tag}`}
                                    onClick={() => openList({ tag })}
                                />
                            ))}
                        </div>
                    )}
                </article>
            </Section>
        </>
    );
}
