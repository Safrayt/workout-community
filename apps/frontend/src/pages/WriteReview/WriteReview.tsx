import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

export default function WriteReview() {

    const { id } = useParams();

    const navigate = useNavigate();

    const { playgrounds } = usePlaygrounds();
    const { addReview } = useReviews();

    const playground =
        id
            ? getPlaygroundById(playgrounds, id)
            : undefined;

    const [text, setText] = useState("");

    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    if (!playground) {

        return (
            <Section title="Написать отзыв">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );

    }

    function handleSubmit(
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

        addReview(newReview);

        navigate(`/playgrounds/${playground.id}/reviews`);
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

                <ActionGroup>
                    <Button
                        type="submit"
                        variant="primary"
                    >
                        Опубликовать отзыв
                    </Button>
                </ActionGroup>

            </form>

        </Section>

    );

}
