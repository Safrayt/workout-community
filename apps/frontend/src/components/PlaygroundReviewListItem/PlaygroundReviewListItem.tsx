import { useState } from "react";

import Textarea from "../ui/Textarea/Textarea";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";

import type { ValidationError } from "../../validation";
import { validateReview } from "../../validation/review";
import { getFieldError } from "../../utils/validation.ts";

import type { PlaygroundReview } from "../../types/review";

import { useReviews } from "../../context/ReviewContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import UserLink from "../UserLink/UserLink";

import { formatDate } from "../../utils/formatDate";

type Props = {
    review: PlaygroundReview;
};

/**
 * Один отзыв в полном списке отзывов площадки. Автору отзыва
 * показывает "Редактировать"/"Удалить"; редактирование — инлайн,
 * без перехода на отдельную страницу.
 */
export default function PlaygroundReviewListItem({
    review,
}: Props) {
    const { updateReview, deleteReview } = useReviews();
    const { currentUser } = useCurrentUser();

    const { getUserById } = useUserDirectory();

    const isOwnReview = review.userId === currentUser.id;

    // Редактировать может только автор (бэкенд тоже это проверяет —
    // см. update_review в app/routers/reviews.py), а вот удалить —
    // ещё и администратор, в рамках модерации (см. delete_review там
    // же и ensure_owner_or_admin в app/auth.py).
    const canEdit = isOwnReview;
    const canDelete = isOwnReview || currentUser.isAdmin;

    const [isEditing, setIsEditing] = useState(false);

    const [text, setText] = useState(review.text);

    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    function handleStartEdit() {
        setText(review.text);
        setErrors([]);
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setText(review.text);
        setErrors([]);
        setIsEditing(false);
    }

    function handleSave() {
        const result = validateReview({
            playgroundId: review.playgroundId,
            text,
        });

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        updateReview(review.id, text).catch((error: unknown) => {
            console.error("Не удалось сохранить отзыв:", error);
        });
        setIsEditing(false);
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Удалить этот отзыв? Это действие нельзя отменить."
        );

        if (!confirmed) {
            return;
        }

        deleteReview(review.id).catch((error: unknown) => {
            console.error("Не удалось удалить отзыв:", error);
        });
    }

    return (
        <li className="playground-reviews-list__item">
            <div className="playground-reviews-list__meta">
                <span className="playground-reviews-list__author">
                    <UserLink
                        username={
                            getUserById(review.userId)?.nickname ?? "неизвестный"
                        }
                    />
                </span>

                <span className="playground-reviews-list__date">
                    {formatDate(review.createdAt)}
                </span>
            </div>

            {
                isEditing

                    ? (

                        <div className="playground-reviews-list__edit">

                            <Textarea
                                id={`review-edit-${review.id}`}
                                label="Ваш отзыв"
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                error={getFieldError(errors, "text")}
                                rows={4}
                            />

                            <ActionGroup>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSave}
                                >
                                    Сохранить
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    Отмена
                                </Button>
                            </ActionGroup>

                        </div>

                    )

                    : (

                        <>
                            <p className="playground-reviews-list__text">
                                {review.text}
                            </p>

                            {
                                (canEdit || canDelete) && (

                                    <div className="playground-reviews-list__owner-actions">
                                        {
                                            canEdit && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleStartEdit}
                                                >
                                                    Редактировать
                                                </Button>
                                            )
                                        }

                                        {
                                            canDelete && (
                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    onClick={handleDelete}
                                                >
                                                    Удалить
                                                </Button>
                                            )
                                        }
                                    </div>

                                )
                            }
                        </>

                    )
            }
        </li>
    );
}
