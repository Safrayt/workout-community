import { useEffect, useState } from "react";

import InfoSection from "../ui/InfoSection/InfoSection";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import ProgramCommentItem from "../ProgramCommentItem/ProgramCommentItem";

import "../../styles/components/program-comments.css";

import type { ValidationError } from "../../validation";
import { validateComment } from "../../validation/comment";
import { getFieldError } from "../../utils/validation";

import { useProgramComments } from "../../context/ProgramCommentContext";

type ProgramCommentsProps = {
    programId: string;
};

/**
 * Список + форма снизу — тот же паттерн, что и ComplexComments.
 * Обсуждение живёт отдельно от структуры версии (п.19 документа):
 * этот компонент ничего не знает про ProgramStructureEditor.
 */
export default function ProgramComments({ programId }: ProgramCommentsProps) {
    const { comments, refreshComments, addComment } = useProgramComments();

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
                                />
                            ))
                        }
                    </ul>
                )
            }

            <form
                className="program-comments__form"
                onSubmit={handleSubmit}
            >
                <Textarea
                    id={`program-comment-new-${programId}`}
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
        </InfoSection>
    );
}
