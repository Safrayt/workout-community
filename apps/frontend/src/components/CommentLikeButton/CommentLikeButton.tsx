import { useState } from "react";

import "../../styles/components/comment-like-button.css";

import type { CommentKind } from "../../api/commentLikes";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../context/CurrentUserContext";
import { useCommentLike } from "../../hooks/useCommentLike";

type Props = {
    kind: CommentKind;
    commentId: string;

    /** Автор комментария: свой комментарий лайкнуть нельзя. */
    authorId: string;
};

function HeartIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            className="comment-like__icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
        >
            <path
                d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.4 1.1 4.2 2.4h3.6C14.6 6.1 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * Лайк на комментарии: сердечко и число лайков в строке действий
 * комментария. Лайкнуть может вошедший пользователь, и не свой
 * комментарий; гостю и автору показывается только число (если оно не
 * нулевое). Число меняется сразу по нажатию, при ошибке возвращается.
 */
export default function CommentLikeButton({
    kind,
    commentId,
    authorId,
}: Props) {
    const { user } = useAuth();
    const { count, liked, toggle } = useCommentLike(kind, commentId);
    const [isPending, setIsPending] = useState(false);

    const isOwnComment = user !== null && user.id === authorId;

    if (user === null || isOwnComment) {
        if (count === 0) {
            return null;
        }

        return (
            <span
                className="comment-like comment-like--static"
                title={
                    isOwnComment
                        ? "Лайки на вашем комментарии"
                        : "Лайки на комментарии. Чтобы поставить свой, нужно войти"
                }
            >
                <HeartIcon filled />
                <span>{count}</span>
            </span>
        );
    }

    async function handleClick() {
        if (isPending) {
            return;
        }

        setIsPending(true);

        try {
            await toggle();
        } catch (error) {
            window.alert(
                error instanceof ApiError
                    ? error.message
                    : "Не удалось изменить лайк. Попробуйте ещё раз."
            );
        } finally {
            setIsPending(false);
        }
    }

    return (
        <button
            type="button"
            className={
                liked
                    ? "comment-like comment-like--liked"
                    : "comment-like"
            }
            aria-pressed={liked}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
            title={liked ? "Убрать лайк" : "Нравится"}
            onClick={handleClick}
        >
            <HeartIcon filled={liked} />

            {count > 0 && <span>{count}</span>}
        </button>
    );
}
