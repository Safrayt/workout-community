import { useState } from "react";

import Textarea from "../ui/Textarea/Textarea";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import Avatar from "../ui/Avatar/Avatar";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation";

import type { ProgramComment } from "../../types/programComment";

import { useProgramComments } from "../../context/ProgramCommentContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import UserLink from "../UserLink/UserLink";

import { linkifyText } from "../../utils/linkifyText";

import { formatDate } from "../../utils/formatDate";

type Props = {
    comment: ProgramComment;
};

/**
 * Комментарии обсуждают программу, но не изменяют её (п.19
 * документа) — этот компонент не имеет никакого отношения к
 * ProgramStructureEditor, только к странице программы.
 */
export default function ProgramCommentItem({ comment }: Props) {
    const { updateComment, deleteComment } = useProgramComments();
    const { currentUser } = useCurrentUser();

    const { getUserById } = useUserDirectory();

    const author = getUserById(comment.userId);

    const isOwnComment = comment.userId === currentUser.id;

    const [isEditing, setIsEditing] = useState(false);

    const [text, setText] = useState(comment.text);

    const [errors, setErrors] = useState<ValidationError[]>([]);

    function handleStartEdit() {
        setText(comment.text);
        setErrors([]);
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setText(comment.text);
        setErrors([]);
        setIsEditing(false);
    }

    function handleSave() {
        const result = validateComment(text);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        updateComment(comment.id, text).catch((error: unknown) => {
            console.error("Не удалось сохранить комментарий:", error);
        });
        setIsEditing(false);
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Удалить этот комментарий? Это действие нельзя отменить."
        );

        if (!confirmed) {
            return;
        }

        deleteComment(comment.id).catch((error: unknown) => {
            console.error("Не удалось удалить комментарий:", error);
        });
    }

    return (
        <li className="program-comments__item">
            <Avatar
                name={author?.nickname ?? "?"}
                avatarUrl={author?.avatarUrl}
                size="sm"
            />

            <div className="program-comments__body">
                <div className="program-comments__meta">
                    <span className="program-comments__author">
                        <UserLink
                            username={author?.nickname ?? "неизвестный"}
                        />
                    </span>

                    <span className="program-comments__date">
                        {formatDate(comment.createdAt)}
                    </span>
                </div>

                {
                    isEditing ? (
                        <div className="program-comments__edit">
                            <Textarea
                                id={`program-comment-edit-${comment.id}`}
                                label="Комментарий"
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                error={getFieldError(errors, "text")}
                                rows={3}
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
                    ) : (
                        <>
                            <p className="program-comments__text">
                                {linkifyText(comment.text)}
                            </p>

                            {
                                isOwnComment && (
                                    <div className="program-comments__owner-actions">
                                        <button
                                            type="button"
                                            className="program-comments__action"
                                            onClick={handleStartEdit}
                                        >
                                            Редактировать
                                        </button>

                                        <button
                                            type="button"
                                            className="program-comments__action program-comments__action--danger"
                                            onClick={handleDelete}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                )
                            }
                        </>
                    )
                }
            </div>
        </li>
    );
}
