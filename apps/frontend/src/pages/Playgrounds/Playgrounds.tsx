import Section from "../../components/ui/Section/Section";
import PlaygroundCard from "../../components/PlaygroundCard/PlaygroundCard";

import { playgrounds } from "../../data/playgrounds";
import { events } from "../../data/events";

import { getEventsCount } from "../../utils/playgroundStatistics";
import { getNextPlaygroundEvent } from "../../utils/getNextPlaygroundEvent";

export default function Playgrounds() {
    return (
        <Section title="Площадки">

            <h3>Карта</h3>

            <p>
                Здесь позже появится интерактивная карта.
            </p>

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