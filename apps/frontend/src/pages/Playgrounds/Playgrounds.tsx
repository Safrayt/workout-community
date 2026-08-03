import Section from "../../components/ui/Section/Section";
import PlaygroundCard from "../../components/PlaygroundCard/PlaygroundCard";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import {
    useEvents,
} from "../../context/EventContext";

import { getEventsCount } from "../../utils/playgroundStatistics";
import { getNextPlaygroundEvent } from "../../utils/getNextPlaygroundEvent";

import { Link } from "react-router-dom";
import { useState } from "react";

import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import PlaygroundsMap from "../../components/Map/PlaygroundsMap";
import {
    getPlaygroundMarkers,
} from "../../utils/maps";

import PlaygroundFilters from "../../components/PlaygroundFilters/PlaygroundFilters";
import {
    emptyPlaygroundFilters,
} from "../../types/playgroundFilters";
import {
    filterPlaygrounds,
} from "../../utils/playgroundFilters";


export default function Playgrounds() {
    const {
        playgrounds,
    } = usePlaygrounds();

    const [filters, setFilters] =
        useState(emptyPlaygroundFilters);

    const [filtersOpen, setFiltersOpen] =
        useState(false);

    const filteredPlaygrounds =
        filterPlaygrounds(
            playgrounds,
            filters
        );

    const markers =
        getPlaygroundMarkers(
            filteredPlaygrounds
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
                onMapClick={(latitude, longitude) => {
                    console.log(
                        latitude,
                        longitude
                    );
                }}
            />

            <hr />

            <button
                type="button"
                className="playground-filters-toggle"
                aria-expanded={filtersOpen}
                onClick={() =>
                    setFiltersOpen(
                        (current) => !current
                    )
                }
            >
                <h3>Фильтры</h3>

                <span className="playground-filters-toggle__icon">
                    {filtersOpen ? "▲" : "▼"}
                </span>
            </button>

            {
                filtersOpen && (
                    <PlaygroundFilters
                        filters={filters}
                        onChange={setFilters}
                    />
                )
            }

            <hr />

            <h3>Все площадки</h3>

            {
                filteredPlaygrounds.length === 0 ? (
                    <p>
                        Нет площадок, подходящих под выбранные фильтры.
                    </p>
                ) : (
                    <div className="playgrounds-list">
                        {
                            filteredPlaygrounds.map((playground) => {

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
                )
            }

        </Section>
    );
}