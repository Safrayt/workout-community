import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import PlaygroundForm from "../../components/PlaygroundForm/PlaygroundForm";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

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

    function handleSubmit(
        formValue: NewPlayground
    ) {
        if (!playground) {
            return;
        }

        updatePlayground(
            playground.id,
            formValue
        );

        navigate(
            `/playgrounds/${playground.id}`
        );
    }

    return (
        <Section title={`Редактирование: ${playground.name}`}>
            <PlaygroundForm
                initialValue={playgroundToFormValue(playground)}
                submitLabel="Сохранить изменения"
                excludePlaygroundId={playground.id}
                onSubmit={handleSubmit}
            />
        </Section>
    );
}