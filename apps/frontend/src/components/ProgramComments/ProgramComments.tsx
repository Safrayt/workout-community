import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import InfoSection from "../ui/InfoSection/InfoSection";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import ProgramCommentItem from "../ProgramCommentItem/ProgramCommentItem";

import "../../styles/components/program-comments.css";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation";

import { useProgramComments } from "../../context/ProgramCommentContext";
import { useAuth } from "../../context/CurrentUserContext";

type ProgramCommentsProps = {
    programId: string;
};

/**
 * Список + форма снизу — тот же паттерн, что и ComplexComments.
 * Обсуждение живёт отдельно от структуры версии (п.19 документа):
 * этот компонент ничего не знает про ProgramStructureEditor.
 *
 * Страницу программы видят и гости (см. handle.guest в
 * app/router.tsx): им комментарии доступны для чтения, а вместо формы
 * показывается "Войдите, чтобы оставить комментарий".
 */
export default function ProgramComments({ programId }: ProgramCommentsProps) {
    const { comments, refreshComments, addComment } = useProgramComments();
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        refreshComments(programId).catch((error: unknown) => {
            console.error(
                `Не удалось загрузить комментарии программы ${programId}:`,
                error
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programId]);

    const programComments = comments.filter(
        (comment) => comment.programId === programId
    );

    const [text, setText] = useState("");

    const [errors, setErrors] = useState<ValidationError[]>([]);

    const textareaId = `program-comment-new-${programId}`;

    function handleReply(nickname: string) {
        setText(`@${nickname} `);
        setErrors([]);

        const textarea = document.getElementById(textareaId);
        textarea?.scrollIntoView({ behavior: "smooth", block: "center" });
        (textarea as HTMLTextAreaElement | null)?.focus();
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const result = validateComment(text);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        addComment(programId, text).catch((error: unknown) => {
            console.error("Не удалось отправить комментарий:", error);
        });

        setText("");
        setErrors([]);
    }

    return (
        <InfoSection
            title={
                programComments.length === 0
                    ? "Комментарии"
                    : `Комментарии (${programComments.length})`
            }
            className="program-comments"
        >
            {
                programComments.length === 0 ? (
                    <p className="program-comments__empty">
                        Пока никто не оставил комментарий. Будь первым!
                    </p>
                ) : (
                    <ul className="program-comments__list">
                        {
                            programComments.map((comment) => (
                                <ProgramCommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReply}
                                />
                            ))
                        }
                    </ul>
                )
            }

            {
                user ? (
                    <form
                        className="program-comments__form"
                        onSubmit={handleSubmit}
                    >
                        <Textarea
                            id={textareaId}
                            label="Оставить комментарий"
                            placeholder="Вопрос автору, предложение, замечание…"
                            value={text}
                            onChange={(event) => {
                                setText(event.target.value);
                                setErrors([]);
                            }}
                            error={getFieldError(errors, "text")}
                            rows={3}
                        />

                        <Button type="submit">
                            Отправить
                        </Button>
                    </form>
                ) : (
                    <p className="program-comments__login-hint">
                        <Link
                            to="/login"
                            state={{
                                from: location.pathname + location.search,
                            }}
                        >
                            Войдите
                        </Link>
                        , чтобы оставить комментарий.
                    </p>
                )
            }
        </InfoSection>
    );
}
