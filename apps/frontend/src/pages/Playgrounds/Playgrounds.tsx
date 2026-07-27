import Section from "../../components/ui/Section/Section";
import PlaygroundCard from "../../components/PlaygroundCard/PlaygroundCard";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import {
    useEvents,
} from "../../context/EventContext";

import { getEventsCount } from "../../utils/playgroundStatistics";
import { getNextPlaygroundEvent } from "../../utils/getNextPlaygroundEvent";

import { Link } from "react-router-dom";

import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import PlaygroundsMap from "../../components/Map/PlaygroundsMap";
import {
    getPlaygroundMarkers,
} from "../../utils/maps";


export default function Playgrounds() {
    const {
        playgrounds,
    } = usePlaygrounds();

    const markers =
        getPlaygroundMarkers(
            playgrounds
        );

    const {
        events,
    } = useEvents();
    return (
        <Section title="Площадки">
            <ActionGroup>
                <Link to="/playgrounds/add">
                    <Button variant="secondary">
                        Добавить площадку
                    </Button>
                </Link>
            </ActionGroup>

            <h3>Карта</h3>

            <PlaygroundsMap
                markers={markers}
            />

            <hr />

            <h3>Все площадки</h3>

            <div className="playgrounds-list">
                {
                    playgrounds.map((playground) => {

                        const eventsCount =
                            getEventsCount(
                                events,
                                playground.id
                            );

                        const nextEvent =
                            getNextPlaygroundEvent(
                                events,
                                playground.id
                            );

                        return (
                            <PlaygroundCard
                                key={playground.id}

                                {...playground}

                                eventsCount={eventsCount}

                                nextEvent={
                                    nextEvent?.startDate
                                }
                            />
                        );
                    })
                }
            </div>

        </Section>
    );
}