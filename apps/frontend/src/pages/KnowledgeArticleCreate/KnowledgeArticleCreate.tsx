import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import ArticleForm from "../../components/ArticleForm/ArticleForm";

import type { NewArticle } from "../../types/article";

import { createArticle } from "../../api/articles";
import { clearArticleDraft } from "../../utils/articleDraftStorage";
import { emptyArticle } from "../../utils/articleForm";

/**
 * /knowledge/articles/create — новая статья (только для администратора,
 * см. RequireAdmin в router.tsx). После сохранения открывается страница
 * статьи — для черновика тоже: администратор видит её так, как её
 * увидят читатели после публикации.
 */
export default function KnowledgeArticleCreate() {
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(value: NewArticle) {
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            const article = await createArticle(value);

            // Статья сохранена на сайте — автосохранённая копия в браузере
            // больше не нужна (иначе при следующей новой статье редактор
            // предложил бы восстановить уже опубликованную).
            clearArticleDraft(null);

            navigate(`/knowledge/articles/${article.id}`);
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

    return (
        <Section title="Новая статья">
            <ArticleForm
                initialValue={emptyArticle}
                isPublishedNow={false}
                isSubmitting={isSubmitting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/knowledge/articles")}
            />
        </Section>
    );
}
