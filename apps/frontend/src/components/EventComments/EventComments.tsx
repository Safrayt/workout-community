import { useEffect, useState } from "react";

import InfoSection from "../ui/InfoSection/InfoSection";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import EventCommentItem from "../EventCommentItem/EventCommentItem";

import "../../styles/components/event-comments.css";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation";

import { useEventComments } from "../../context/EventCommentContext";

type EventCommentsProps = {
    eventId: string;
};

export default function EventComments({ eventId }: EventCommentsProps) {
    const { comments, refreshComments, addComment } = useEventComments();

    useEffect(() => {
        refreshComments(eventId).catch((error: unknown) => {
            console.error(
                `Не удалось загрузить комментарии мероприятия ${eventId}:`,
                error
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const eventComments = comments.filter(
        (comment) => comment.eventId === eventId
    );

    const [text, setText] = useState("");

    const [errors, setErrors] = useState<ValidationError[]>([]);

    const textareaId = `event-comment-new-${eventId}`;

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

        addComment(eventId, text).catch((error: unknown) => {
            console.error("Не удалось отправить комментарий:", error);
        });

        setText("");
        setErrors([]);
    }

    return (
        <InfoSection
            title={
                eventComments.length === 0
                    ? "Комментарии"
                    : `Комментарии (${eventComments.length})`
            }
            className="event-comments"
        >
            {
                eventComments.length === 0 ? (
                    <p className="event-comments__empty">
                        Пока никто не оставил комментарий. Будь первым!
                    </p>
                ) : (
                    <ul className="event-comments__list">
                        {
                            eventComments.map((comment) => (
                                <EventCommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReply}
                                />
                            ))
                        }
                    </ul>
                )
            }

            <form
                className="event-comments__form"
                onSubmit={handleSubmit}
            >
                <Textarea
                    id={textareaId}
                    label="Оставить комментарий"
                    placeholder="Вопрос организатору, план встречи, отметьте участников через @Ник…"
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
