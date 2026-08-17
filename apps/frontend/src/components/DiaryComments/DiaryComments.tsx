import { useState } from "react";

import InfoSection from "../ui/InfoSection/InfoSection";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import DiaryCommentItem from "../DiaryCommentItem/DiaryCommentItem";

import "../../styles/components/diary-comments.css";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation.ts";

import type { DiaryRecordType } from "../../types/diaryRecord";

import { useComments } from "../../context/CommentContext";

import { getCommentsForRecord } from "../../utils/comments";

type DiaryCommentsProps = {
    recordId: string;
    recordType: DiaryRecordType;
};

/**
 * Комментарии доступны под любой записью дневника, которую вообще
 * можно открыть — включая чужие (запись сама по себе не скрыта от
 * посторонних отдельно от приватности всего раздела "Дневник" на
 * профиле, см. UX-PROFILE). Оставить комментарий может кто угодно,
 * авторизации в проекте нет.
 */
export default function DiaryComments({
    recordId,
    recordType,
}: DiaryCommentsProps) {
    const { comments, addComment } = useComments();

    const recordComments = getCommentsForRecord(
        comments,
        recordId,
        recordType
    );

    const [text, setText] = useState("");

    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    function handleSubmit(
        event: React.FormEvent
    ) {
        event.preventDefault();

        const result = validateComment(text);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        addComment(recordId, recordType, text);

        setText("");
        setErrors([]);
    }

    return (
        <InfoSection
            title={
                recordComments.length === 0
                    ? "Комментарии"
                    : `Комментарии (${recordComments.length})`
            }
            className="diary-comments"
        >
            {
                recordComments.length === 0 ? (
                    <p className="diary-comments__empty">
                        Пока никто не оставил комментарий. Будь первым!
                    </p>
                ) : (
                    <ul className="diary-comments__list">
                        {
                            recordComments.map((comment) => (
                                <DiaryCommentItem
                                    key={comment.id}
                                    comment={comment}
                                />
                            ))
                        }
                    </ul>
                )
            }

            <form
                className="diary-comments__form"
                onSubmit={handleSubmit}
            >
                <Textarea
                    id={`comment-new-${recordType}-${recordId}`}
                    label="Оставить комментарий"
                    placeholder="Что думаешь об этой записи?"
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
