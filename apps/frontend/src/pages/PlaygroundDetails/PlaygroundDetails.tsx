import { useNavigate, useParams } from "react-router-dom";

import "../../styles/components/playground-header.css";

import PlaygroundInfo from "../../components/PlaygroundInfo/PlaygroundInfo";
import PlaygroundMainPhoto from "../../components/PlaygroundMainPhoto/PlaygroundMainPhoto";
import PlaygroundGallery from "../../components/PlaygroundGallery/PlaygroundGallery";
import PlaygroundAmenities from "../../components/PlaygroundAmenities/PlaygroundAmenities";
import PlaygroundEquipment from "../../components/PlaygroundEquipment/PlaygroundEquipment";
import PlaygroundQuickFacts from "../../components/PlaygroundQuickFacts/PlaygroundQuickFacts";
import PlaygroundActions from "../../components/PlaygroundActions/PlaygroundActions";
import PlaygroundUpcomingEvent from "../../components/PlaygroundUpcomingEvent/PlaygroundUpcomingEvent";
import PlaygroundReviews from "../../components/PlaygroundReviews/PlaygroundReviews";
import PlaygroundActivity from "../../components/PlaygroundActivity/PlaygroundActivity";
import PlaygroundAllTimeActivity from "../../components/PlaygroundAllTimeActivity/PlaygroundAllTimeActivity";

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
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useFavorites,
} from "../../context/FavoriteContext";

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

    const {
        entries: workoutEntries,
    } = useWorkoutDiary();

    const {
        favorites,
    } = useFavorites();

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

            {/* 5. Equipment */}
            <PlaygroundEquipment
                playground={playground}
            />

            {/* 6. Gallery */}
            <PlaygroundGallery
                photos={playground.photos}
            />

            {/* 7. Reviews */}
            <PlaygroundReviews
                playgroundId={playground.id}
            />

            {/* 8. Upcoming events */}
            <PlaygroundUpcomingEvent
                playgroundId={playground.id}
                events={playgroundEvents}
                registrations={registrations}
            />

            {/* 9. Activity (30 days) */}
            <PlaygroundActivity
                playgroundId={playground.id}
                events={playgroundEvents}
                workoutEntries={workoutEntries}
            />

            {/* 10. Activity (all time) */}
            <PlaygroundAllTimeActivity
                playgroundId={playground.id}
                events={playgroundEvents}
                workoutEntries={workoutEntries}
                favorites={favorites}
            />

        </div>

    );

}
