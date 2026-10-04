import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import FormSection from "../../components/ui/FormSection/FormSection";
import ExerciseForm from "../../components/ExerciseForm/ExerciseForm";

import "../../styles/components/exercise-edit.css";

import type {
    ExerciseMediaChanges,
    NewExercise,
} from "../../types/newExercise";

import { useExercises } from "../../context/ExerciseContext";

import { exerciseToFormValue } from "../../utils/exerciseForm";
import { applyExerciseMedia } from "../../utils/exerciseMedia";

/**
 * /knowledge/exercises/:id/edit — редактирование упражнения (только для
 * администратора, см. RequireAdmin в router.tsx). В самом низу —
 * "Опасная зона" с удалением, как на странице редактирования программы.
 */
export default function KnowledgeExerciseEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        getExerciseById,
        isLoading,
        editExercise,
        removeExercise,
        uploadPhoto,
        removePhoto,
        uploadVideo,
        removeVideo,
    } = useExercises();

    const exercise = id ? getExerciseById(id) : undefined;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!exercise && isLoading) {
        return (
            <Section title="Упражнения">
                <p>Загрузка…</p>
            </Section>
        );
    }

    if (!exercise) {
        return (
            <Section title="Упражнения">
                <p>Упражнение не найдено.</p>

                <Link to="/knowledge/exercises">
                    <Button variant="outline">К списку упражнений</Button>
                </Link>
            </Section>
        );
    }

    const current = exercise;
    const detailsPath = `/knowledge/exercises/${current.id}`;

    async function handleSubmit(
        value: NewExercise,
        media: ExerciseMediaChanges
    ) {
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            await editExercise(current.id, value);
        } catch (error: unknown) {
            console.error("Не удалось сохранить упражнение:", error);

            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Не удалось сохранить упражнение. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
            return;
        }

        const mediaErrors = await applyExerciseMedia(current.id, media, {
            uploadPhoto,
            removePhoto,
            uploadVideo,
            removeVideo,
        });

        setIsSubmitting(false);

        if (mediaErrors.length > 0) {
            // Текст уже сохранён. Остаёмся в форме: повторное сохранение
            // безопасно и заодно повторит загрузку файлов.
            setSubmitError(
                "Текст сохранён, но файлы загрузить не удалось: " +
                    mediaErrors.join("; ")
            );
            return;
        }

        navigate(detailsPath);
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            `Удалить упражнение «${current.name}»? Это действие нельзя отменить.`
        );

        if (!confirmed) return;

        setIsDeleting(true);

        try {
            await removeExercise(current.id);
            navigate("/knowledge/exercises");
        } catch (error: unknown) {
            console.error("Не удалось удалить упражнение:", error);

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Не удалось удалить упражнение."
            );
            setIsDeleting(false);
        }
    }

    return (
        <Section title={`Редактирование: ${current.name}`}>
            <ExerciseForm
                // key — при переходе на другое упражнение форма создаётся
                // заново с его данными, а не показывает прежние.
                key={current.id}
                initialValue={exerciseToFormValue(current)}
                currentPhotoUrl={current.photoUrl}
                currentVideoUrl={current.videoUrl}
                submitLabel="Сохранить"
                isSubmitting={isSubmitting || isDeleting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onCancel={() => navigate(detailsPath)}
            />

            <div className="exercise-edit__danger">
                <FormSection title="Опасная зона">
                    <p className="exercise-edit__hint">
                        Удаление необратимо. Вместе с упражнением удаляются
                        загруженные для него фото и видео, а ссылки на
                        страницу упражнения перестанут работать.
                    </p>

                    <Button
                        type="button"
                        variant="danger"
                        disabled={isDeleting || isSubmitting}
                        onClick={handleDelete}
                    >
                        {isDeleting ? "Удаляем…" : "Удалить упражнение"}
                    </Button>
                </FormSection>
            </div>
        </Section>
    );
}
