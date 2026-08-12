import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";
import "../../styles/components/events-list.css";

import {
    useEvents,
} from "../../context/EventContext";
import { getParticipantCount } from "../../utils/eventParticipants";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";
import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import { Link } from "react-router-dom";
import { useState } from "react";

import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Badge from "../../components/ui/Badge/Badge";

import PlaygroundsMap from "../../components/Map/PlaygroundsMap";
import { getEventPlaygroundMarkers } from "../../utils/eventMaps";

import EventFilters from "../../components/EventFilters/EventFilters";
import { defaultEventFilters } from "../../types/eventFilters";
import {
    filterEvents,
    hasActiveEventFilters,
    countActiveEventFilters,
} from "../../utils/eventFilters";

import {
    sortEventsAscending,
    sortEventsDescending,
} from "../../utils/events";

import { pluralizeRu } from "../../utils/pluralize";

import type { Event } from "../../types/event";


export default function Events() {
    const {
        registrations,
        register,
        cancel,
        checkRegistration,
    } = useRegistration();

    const {
        events,
    } = useEvents();

    const {
        playgrounds,
    } = usePlaygrounds();

    const [filters, setFilters] =
        useState(defaultEventFilters);

    const [filtersOpen, setFiltersOpen] =
        useState(false);

    // Клик по маркеру на карте — сужает список до событий на этой
    // площадке. Отдельно от focusMarkerId: клик по маркеру карту не
    // двигает, она уже показывает выбранную площадку.
    const [selectedPlaygroundId, setSelectedPlaygroundId] =
        useState<string | null>(null);

    // Клик по карточке в списке — панорамирует и приближает карту
    // к площадке этого события (карту это не фильтрует).
    const [focusMarkerId, setFocusMarkerId] =
        useState<string | null>(null);

    const eventsMatchingFilters = filterEvents(events, filters);

    const markerOrder =
        filters.status === "completed"
            ? "desc"
            : "asc";

    const eventMapMarkers = getEventPlaygroundMarkers(
        playgrounds,
        eventsMatchingFilters,
        markerOrder
    );

    // Если выбранная кликом по маркеру площадка пропала с карты после
    // смены фильтров (на ней больше нет подходящих событий) — список
    // не должен оставаться отфильтрован "в никуда"; выбор игнорируется,
    // пока сама площадка не появится на карте снова.
    const effectiveSelectedPlaygroundId =
        selectedPlaygroundId &&
        eventMapMarkers.some(
            (marker) => marker.id === selectedPlaygroundId
        )
            ? selectedPlaygroundId
            : null;

    const selectedPlayground =
        effectiveSelectedPlaygroundId
            ? getPlaygroundById(playgrounds, effectiveSelectedPlaygroundId)
            : undefined;

    const filteredEvents = eventsMatchingFilters
        .filter(
            (event) =>
                !effectiveSelectedPlaygroundId ||
                event.playgroundId === effectiveSelectedPlaygroundId
        );

    const sortedFilteredEvents =
        markerOrder === "desc"
            ? sortEventsDescending(filteredEvents)
            : sortEventsAscending(filteredEvents);

    const activeFiltersCount = countActiveEventFilters(filters);

    const canResetAll =
        hasActiveEventFilters(filters) ||
        Boolean(effectiveSelectedPlaygroundId);

    function resetAllFilters() {
        setFilters(defaultEventFilters);
        setSelectedPlaygroundId(null);
    }

    function renderEventCard(event: Event) {
        const participants =
            getParticipantCount(
                registrations,
                event.id
            );

        const registered = checkRegistration(event.id);

        const playground =
            getPlaygroundById(
                playgrounds,
                event.playgroundId
            );

        return (
            <EventCard
                key={event.id}
                {...event}
                playground={playground}
                expectedParticipants={participants}
                isRegistered={registered}
                onRegister={() => register(event.id)}
                onCancelRegistration={() => cancel(event.id)}
                onSelect={() => setFocusMarkerId(event.playgroundId)}
            />
        );
    }

    return (
        <Section title="События">
            <ActionGroup>
                <Link to="/events/create">
                    <Button variant="primary">
                        Создать событие
                    </Button>
                </Link>
            </ActionGroup>

            <h3>Карта событий</h3>

            <PlaygroundsMap
                markers={eventMapMarkers}
                selectedMarkerId={effectiveSelectedPlaygroundId ?? undefined}
                focusMarkerId={focusMarkerId ?? undefined}
                onMarkerClick={(marker) => setSelectedPlaygroundId(marker.id)}
            />

            <hr />

            {
                selectedPlayground && (
                    <div className="events-playground-filter">
                        <span>
                            {`Показаны события на площадке «${selectedPlayground.name}»`}
                        </span>

                        <Button
                            variant="outline"
                            onClick={() => setSelectedPlaygroundId(null)}
                        >
                            Показать все события
                        </Button>
                    </div>
                )
            }

            <button
                type="button"
                className="events-filters-toggle"
                aria-expanded={filtersOpen}
                onClick={() =>
                    setFiltersOpen(
                        (current) => !current
                    )
                }
            >
                <span className="events-filters-toggle__label">
                    <h3>Фильтры</h3>

                    {
                        activeFiltersCount > 0 && (
                            <Badge variant="primary">
                                {activeFiltersCount}
                            </Badge>
                        )
                    }
                </span>

                <span className="events-filters-toggle__icon">
                    {filtersOpen ? "▲" : "▼"}
                </span>
            </button>

            {
                filtersOpen && (
                    <EventFilters
                        filters={filters}
                        onChange={setFilters}
                    />
                )
            }

            <hr />

            {
                events.length === 0 ? (
                    <div className="events-empty-state">
                        <p className="events-empty-state__title">
                            Событий пока нет
                        </p>

                        <p className="events-empty-state__description">
                            Станьте первым, кто организует тренировку для сообщества.
                        </p>

                        <Link to="/events/create">
                            <Button variant="primary">
                                Создать событие
                            </Button>
                        </Link>
                    </div>
                ) : sortedFilteredEvents.length === 0 ? (
                    <div className="events-empty-state">
                        <p className="events-empty-state__title">
                            Ничего не найдено
                        </p>

                        <p className="events-empty-state__description">
                            Попробуйте изменить параметры фильтра.
                        </p>

                        {
                            canResetAll && (
                                <Button
                                    variant="outline"
                                    onClick={resetAllFilters}
                                >
                                    Сбросить фильтры
                                </Button>
                            )
                        }
                    </div>
                ) : (
                    <>
                        <p className="events-count">
                            {
                                `Найдено: ${sortedFilteredEvents.length} ${
                                    pluralizeRu(
                                        sortedFilteredEvents.length,
                                        ["событие", "события", "событий"]
                                    )
                                }`
                            }
                        </p>

                        <div className="events-list">
                            {sortedFilteredEvents.map(renderEventCard)}
                        </div>
                    </>
                )
            }
        </Section>
    );
}
