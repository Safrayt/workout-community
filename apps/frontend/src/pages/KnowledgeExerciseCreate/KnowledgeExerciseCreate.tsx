import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import ExerciseForm from "../../components/ExerciseForm/ExerciseForm";

import {
    EMPTY_NEW_EXERCISE,
    type ExerciseMediaChanges,
    type NewExercise,
} from "../../types/newExercise";

import { useExercises } from "../../context/ExerciseContext";

import { applyExerciseMedia } from "../../utils/exerciseMedia";

/**
 * /knowledge/exercises/create — добавление упражнения (только для
 * администратора, см. RequireAdmin в router.tsx).
 *
 * Сначала сохраняется текст — получается упражнение со своим адресом, —
 * и только потом к нему загружаются фото и видео. Если с файлами что-то
 * не вышло, упражнение уже сохранено, поэтому человека открывает его
 * страницу редактирования, где файлы можно загрузить заново: повторная
 * отправка этой формы создала бы второе такое же упражнение.
 */
export default function KnowledgeExerciseCreate() {
    const navigate = useNavigate();
    const {
        addExercise,
        uploadPhoto,
        removePhoto,
        uploadVideo,
        removeVideo,
    } = useExercises();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(
        value: NewExercise,
        media: ExerciseMediaChanges
    ) {
        setSubmitError(null);
        setIsSubmitting(true);

        let createdId: string;

        try {
            createdId = (await addExercise(value)).id;
        } catch (error: unknown) {
            console.error("Не удалось создать упражнение:", error);

            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Не удалось создать упражнение. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
            return;
        }

        const mediaErrors = await applyExerciseMedia(createdId, media, {
            uploadPhoto,
            removePhoto,
            uploadVideo,
            removeVideo,
        });

        setIsSubmitting(false);

        if (mediaErrors.length > 0) {
            window.alert(
                "Упражнение сохранено, но файлы загрузить не удалось:\n" +
                    mediaErrors.join("\n") +
                    "\n\nЗагрузите их заново на странице редактирования."
            );

            navigate(`/knowledge/exercises/${createdId}/edit`);
            return;
        }

        navigate(`/knowledge/exercises/${createdId}`);
    }

    return (
        <Section title="Новое упражнение">
            <ExerciseForm
                initialValue={EMPTY_NEW_EXERCISE}
                submitLabel="Добавить упражнение"
                isSubmitting={isSubmitting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/knowledge/exercises")}
            />
        </Section>
    );
}
