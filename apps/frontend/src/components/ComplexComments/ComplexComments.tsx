import { useEffect, useState } from "react";

import InfoSection from "../ui/InfoSection/InfoSection";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import ComplexCommentItem from "../ComplexCommentItem/ComplexCommentItem";

import "../../styles/components/complex-comments.css";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation.ts";

import { useComplexComments } from "../../context/ComplexCommentContext";

type ComplexCommentsProps = {
    complexId: string;
};

/**
 * Комментарии под комплексом — тот же паттерн, что и в дневнике
 * (DiaryComments): список + форма снизу, без отдельной страницы.
 * Раздел "Комплексы" целиком под ProtectedLayout (см. app/router.tsx),
 * так что к моменту, когда этот компонент вообще монтируется,
 * пользователь уже точно авторизован — отдельный "войдите, чтобы
 * оставить комментарий" тут не нужен.
 */
export default function ComplexComments({ complexId }: ComplexCommentsProps) {
    const { comments, refreshComments, addComment } = useComplexComments();

    useEffect(() => {
        refreshComments(complexId).catch((error: unknown) => {
            console.error(
                `Не удалось загрузить комментарии комплекса ${complexId}:`,
                error
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complexId]);

    const complexComments = comments.filter(
        (comment) => comment.complexId === complexId
    );

    const [text, setText] = useState("");

    const [errors, setErrors] = useState<ValidationError[]>([]);

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const result = validateComment(text);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        addComment(complexId, text).catch((error: unknown) => {
            console.error("Не удалось отправить комментарий:", error);
        });

        setText("");
        setErrors([]);
    }

    return (
        <InfoSection
            title={
                complexComments.length === 0
                    ? "Комментарии"
                    : `Комментарии (${complexComments.length})`
            }
            className="complex-comments"
        >
            {
                complexComments.length === 0 ? (
                    <p className="complex-comments__empty">
                        Пока никто не оставил комментарий. Будь первым!
                    </p>
                ) : (
                    <ul className="complex-comments__list">
                        {
                            complexComments.map((comment) => (
                                <ComplexCommentItem
                                    key={comment.id}
                                    comment={comment}
                                />
                            ))
                        }
                    </ul>
                )
            }

            <form
                className="complex-comments__form"
                onSubmit={handleSubmit}
            >
                <Textarea
                    id={`complex-comment-new-${complexId}`}
                    label="Оставить комментарий"
                    placeholder="Что думаешь об этой схеме?"
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
        </InfoSection>
    );
}
