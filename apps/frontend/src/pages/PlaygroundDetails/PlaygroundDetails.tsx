import { useNavigate, useParams } from "react-router-dom";

import "../../styles/components/playground-header.css";

import PlaygroundInfo from "../../components/PlaygroundInfo/PlaygroundInfo";
import PlaygroundMainPhoto from "../../components/PlaygroundMainPhoto/PlaygroundMainPhoto";
import PlaygroundGallery from "../../components/PlaygroundGallery/PlaygroundGallery";
import PlaygroundAmenities from "../../components/PlaygroundAmenities/PlaygroundAmenities";
import PlaygroundEquipment from "../../components/PlaygroundEquipment/PlaygroundEquipment";
import PlaygroundEvents from "../../components/PlaygroundEvents/PlaygroundEvents";
import PlaygroundQuickFacts from "../../components/PlaygroundQuickFacts/PlaygroundQuickFacts";
import PlaygroundActions from "../../components/PlaygroundActions/PlaygroundActions";
import PlaygroundUpcomingEvent from "../../components/PlaygroundUpcomingEvent/PlaygroundUpcomingEvent";
import PlaygroundReviews from "../../components/PlaygroundReviews/PlaygroundReviews";
import PlaygroundActivity from "../../components/PlaygroundActivity/PlaygroundActivity";
import SimilarPlaygrounds from "../../components/SimilarPlaygrounds/SimilarPlaygrounds";

import Section from "../../components/ui/Section/Section";

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

    function handleEdit() {
        if (!playground) {
            return;
        }

        navigate(`/playgrounds/${playground.id}/edit`);
    }

    return (

        <div className="playground-details">

            {/* 1. Cover Photo */}
            <PlaygroundMainPhoto
                photos={playground.photos}
                playgroundName={playground.name}
            />

            {/* 2. Title */}
            <header className="playground-header">
                <h1 className="playground-header__name">
                    {playground.name}
                </h1>

                <p className="playground-header__address">
                    {playground.locality}
                    {", "}
                    {playground.address}
                </p>
            </header>

            <PlaygroundQuickFacts
                playground={playground}
                playgroundEvents={playgroundEvents}
            />

            {/* 3. Primary Action */}
            <PlaygroundActions
                playground={playground}
                isOwner={isOwner}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* 4. Key Information */}
            <PlaygroundInfo
                playground={playground}
                onEdit={handleEdit}
            />

            <PlaygroundAmenities
                playground={playground}
            />

            {/* 5. Upcoming Event */}
            <PlaygroundUpcomingEvent
                events={playgroundEvents}
                registrations={registrations}
            />

            {/* 6. Equipment */}
            <PlaygroundEquipment
                playground={playground}
            />

            {/* 7. Gallery */}
            <PlaygroundGallery
                photos={playground.photos}
            />

            {/* 8. Reviews */}
            <PlaygroundReviews />

            {/* 9. Activity */}
            <PlaygroundActivity
                events={playgroundEvents}
            />

            <PlaygroundEvents
                events={playgroundEvents}
                registrations={registrations}
            />

            {/* 10. Similar Playgrounds */}
            <SimilarPlaygrounds />

        </div>

    );

}
