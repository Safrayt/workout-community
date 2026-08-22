import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import PlaygroundForm from "../../components/PlaygroundForm/PlaygroundForm";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { ApiError } from "../../api/errors";

import { getPlaygroundById } from "../../utils/playgrounds";
import { playgroundToFormValue } from "../../utils/playgroundForm";

import type { NewPlayground } from "../../types/newPlayground";

export default function EditPlayground() {
    const { id } = useParams();

    const {
        playgrounds,
        updatePlayground,
    } = usePlaygrounds();

    const { currentUser } =
        useCurrentUser();

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const playground =
        id
            ? getPlaygroundById(
                playgrounds,
                id
            )
            : undefined;

    if (!playground) {
        return (
            <Section title="Площадка">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );
    }

    if (playground.creatorId !== currentUser.id) {
        return (
            <Section title="Редактирование площадки">
                <p>
                    У вас нет прав на редактирование этой площадки.
                </p>
            </Section>
        );
    }

    async function handleSubmit(
        formValue: NewPlayground
    ) {
        if (!playground) {
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await updatePlayground(
                playground.id,
                formValue
            );

            navigate(
                `/playgrounds/${playground.id}`
            );
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сохранить изменения. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    return (
        <Section title={`Редактирование: ${playground.name}`}>
            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            <PlaygroundForm
                initialValue={playgroundToFormValue(playground)}
                submitLabel={
                    isSubmitting ? "Сохраняем…" : "Сохранить изменения"
                }
                excludePlaygroundId={playground.id}
                onSubmit={handleSubmit}
            />
        </Section>
    );
}