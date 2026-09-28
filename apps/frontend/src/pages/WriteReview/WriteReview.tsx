import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import "../../styles/components/write-review.css";

import Section from "../../components/ui/Section/Section";
import Textarea from "../../components/ui/Textarea/Textarea";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import type { ValidationError } from "../../validation";
import { validateReview } from "../../validation/review";
import { getFieldError } from "../../utils/validation.ts";

import type { NewReview } from "../../types/newReview";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useReviews } from "../../context/ReviewContext";

import { getPlaygroundById } from "../../utils/playgrounds";

import { ApiError } from "../../api/errors";

export default function WriteReview() {

    const { id } = useParams();

    const navigate = useNavigate();
    const location = useLocation();

    const { playgrounds } = usePlaygrounds();
    const { addReview } = useReviews();

    const playground =
        id
            ? getPlaygroundById(playgrounds, id)
            : undefined;

    // "Ответить" на чужой отзыв (PlaygroundReviewListItem) переходит
    // сюда с этим состоянием — в отличие от комментариев дневника/
    // программ/комплексов/событий, форма отзыва живёт на отдельной
    // странице, а не рядом со списком, поэтому подставить "@Ник"
    // напрямую в поле нельзя — передаём через navigate(..., { state }).
    const replyToNickname = (
        location.state as { replyToNickname?: string } | null
    )?.replyToNickname;

    const [text, setText] = useState(
        replyToNickname ? `@${replyToNickname} ` : ""
    );

    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!replyToNickname) {
            return;
        }

        const textarea = document.getElementById(
            "review-text"
        ) as HTMLTextAreaElement | null;

        textarea?.focus();
        textarea?.setSelectionRange(text.length, text.length);
        // Только при заходе через "Ответить" — дальше пользователь сам
        // редактирует текст, перехватывать курсор не нужно.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!playground) {

        return (
            <Section title="Написать отзыв">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );

    }

    async function handleSubmit(
        event: React.FormEvent
    ) {
        event.preventDefault();

        if (!playground) {
            return;
        }

        const newReview: NewReview = {
            playgroundId: playground.id,
            text,
        };

        const result = validateReview(newReview);

        if (!result.valid) {
            setErrors(result.errors);

            return;
        }

        setSubmitError(null);
        setIsSubmitting(true);

        try {
            await addReview(newReview);
            navigate(`/playgrounds/${playground.id}/reviews`);
        } catch (err) {
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось опубликовать отзыв. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    return (

        <Section title={`Написать отзыв: ${playground.name}`}>

            <Link
                to={`/playgrounds/${playground.id}/reviews`}
                className="write-review__back"
            >
                ← Назад к отзывам
            </Link>

            <form onSubmit={handleSubmit}>

                <Textarea
                    id="review-text"
                    label="Ваш отзыв"
                    placeholder="Расскажите, что понравилось или не понравилось на этой площадке"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    error={getFieldError(errors, "text")}
                    rows={6}
                />

                {submitError && (
                    <p className="auth-form__error" role="alert">
                        {submitError}
                    </p>
                )}

                <ActionGroup>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Публикуем…" : "Опубликовать отзыв"}
                    </Button>
                </ActionGroup>

            </form>

        </Section>

    );

}
