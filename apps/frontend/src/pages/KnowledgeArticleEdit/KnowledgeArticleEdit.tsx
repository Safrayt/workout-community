import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import FormSection from "../../components/ui/FormSection/FormSection";
import ArticleForm from "../../components/ArticleForm/ArticleForm";

import "../../styles/components/article-edit.css";

import type { NewArticle } from "../../types/article";

import { deleteArticle, getArticle, updateArticle } from "../../api/articles";
import { ApiError } from "../../api/errors";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { clearArticleDraft } from "../../utils/articleDraftStorage";
import { articleToFormValue } from "../../utils/articleForm";

/**
 * /knowledge/articles/:id/edit — редактирование статьи (только для
 * администратора, см. RequireAdmin в router.tsx). В самом низу —
 * "Опасная зона" с удалением, как на странице редактирования
 * упражнения.
 */
export default function KnowledgeArticleEdit() {
    const { id = "" } = useParams();
    const navigate = useNavigate();

    // Статью берём с сервера, а не из списка: в списке нет текста, а
    // для администратора там нет и черновиков.
    const resource = useAsyncResource(`article-edit:${id}`, () =>
        getArticle(id)
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
                <p>
                    {notFound
                        ? "Статья не найдена."
                        : (resource.error?.message ??
                          "Не удалось загрузить статью.")}
                </p>

                <Link to="/knowledge/articles">
                    <Button variant="outline">К списку статей</Button>
                </Link>
            </Section>
        );
    }

    const article = resource.data;
    const detailsPath = `/knowledge/articles/${article.id}`;

    async function handleSubmit(value: NewArticle) {
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            await updateArticle(article.id, value);

            // Сохранено на сайте — копия в браузере больше не нужна.
            clearArticleDraft(article.id);

            navigate(detailsPath);
        } catch (error: unknown) {
            console.error("Не удалось сохранить статью:", error);

            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Не удалось сохранить статью. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            `Удалить статью «${article.title}»? Это действие нельзя отменить.`
        );

        if (!confirmed) return;

        setIsDeleting(true);

        try {
            await deleteArticle(article.id);

            // Статьи больше нет — и копию править некуда.
            clearArticleDraft(article.id);

            navigate("/knowledge/articles");
        } catch (error: unknown) {
            console.error("Не удалось удалить статью:", error);

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Не удалось удалить статью."
            );
            setIsDeleting(false);
        }
    }

    return (
        <Section title={`Редактирование: ${article.title}`}>
            <ArticleForm
                // key — при переходе на другую статью форма создаётся
                // заново с её данными, а не показывает прежние.
                key={article.id}
                articleId={article.id}
                // updatedAt — версия статьи, с которой началась правка: если
                // за время жизни автосохранённой копии статью изменили на
                // сайте, редактор предупредит о конфликте.
                baseUpdatedAt={article.updatedAt}
                initialValue={articleToFormValue(article)}
                isPublishedNow={article.isPublished}
                isSubmitting={isSubmitting || isDeleting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onCancel={() => navigate(detailsPath)}
            />

            <div className="article-edit__danger">
                <FormSection title="Опасная зона">
                    <p className="article-edit__hint">
                        Удаление необратимо. Вместе со статьёй удаляются
                        загруженные для неё картинки, а ссылки на страницу
                        статьи перестанут работать.
                    </p>

                    <Button
                        type="button"
                        variant="danger"
                        disabled={isDeleting || isSubmitting}
                        onClick={handleDelete}
                    >
                        {isDeleting ? "Удаляем…" : "Удалить статью"}
                    </Button>
                </FormSection>
            </div>
        </Section>
    );
}
