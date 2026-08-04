import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import PlaygroundInfo from "../../components/PlaygroundInfo/PlaygroundInfo";
import PlaygroundMainPhoto from "../../components/PlaygroundMainPhoto/PlaygroundMainPhoto";
import PlaygroundGallery from "../../components/PlaygroundGallery/PlaygroundGallery";
import PlaygroundAmenities from "../../components/PlaygroundAmenities/PlaygroundAmenities";
import PlaygroundEquipment from "../../components/PlaygroundEquipment/PlaygroundEquipment";
import PlaygroundEvents from "../../components/PlaygroundEvents/PlaygroundEvents";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getPlaygroundEvents,
} from "../../utils/playgroundEvents";

export default function PlaygroundDetails() {

    const { id } = useParams();

    const navigate = useNavigate();

    const {
        playgrounds,
        deletePlayground,
    } = usePlaygrounds();

    const {
        currentUser,
    } = useCurrentUser();

    const {
        events,
    } = useEvents();

    const {
        registrations,
    } = useRegistration();

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

    const playgroundEvents =
        getPlaygroundEvents(
            events,
            playground.id
        );

    const isOwner =
        playground.creatorId === currentUser.id;

    function handleDelete() {
        if (!playground) {
            return;
        }

        const confirmed = window.confirm(
            `Удалить площадку «${playground.name}»? Это действие необратимо.`
        );

        if (!confirmed) {
            return;
        }

        deletePlayground(playground.id);

        navigate("/playgrounds");
    }

    return (

        <Section title={playground.name}>

            <PlaygroundMainPhoto
                photos={playground.photos}
                playgroundName={playground.name}
            />

            <PlaygroundInfo
                playground={playground}
            />

            <PlaygroundGallery
                photos={playground.photos}
            />

            <PlaygroundAmenities
                playground={playground}
            />

            <PlaygroundEquipment
                playground={playground}
            />

            <PlaygroundEvents
                events={playgroundEvents}
                registrations={registrations}
            />

            {
                isOwner && (
                    <ActionGroup>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                navigate(`/playgrounds/${playground.id}/edit`)
                            }
                        >
                            Редактировать
                        </Button>

                        <Button
                            variant="danger"
                            onClick={handleDelete}
                        >
                            Удалить площадку
                        </Button>
                    </ActionGroup>
                )
            }

        </Section>

    );

}