import Section from "../../components/ui/Section/Section";
import PlaygroundCard from "../../components/PlaygroundCard/PlaygroundCard";
import "../../styles/components/playgrounds-list.css";

import { usePlaygrounds } from "../../context/PlaygroundContext";

import { Link } from "react-router-dom";
import { useState } from "react";

import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Badge from "../../components/ui/Badge/Badge";

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
    hasActivePlaygroundFilters,
    countActivePlaygroundFilters,
} from "../../utils/playgroundFilters";
import { pluralizeRu } from "../../utils/pluralize";


export default function Playgrounds() {
    const {
        playgrounds,
    } = usePlaygrounds();

    const [filters, setFilters] =
        useState(emptyPlaygroundFilters);

    const [filtersOpen, setFiltersOpen] =
        useState(false);

    const [hoveredPlaygroundId, setHoveredPlaygroundId] =
        useState<string | null>(null);

    const [selectedPlaygroundId, setSelectedPlaygroundId] =
        useState<string | null>(null);

    // Отдельно от selectedPlaygroundId: карта панорамируется к маркеру
    // только когда площадка выбрана кликом по карточке в списке. Клик
    // по самому маркеру на карте выбор устанавливает (для подсветки
    // карточки), но карту не двигает и не масштабирует.
    const [focusPlaygroundId, setFocusPlaygroundId] =
        useState<string | null>(null);

    const filteredPlaygrounds =
        filterPlaygrounds(
            playgrounds,
            filters
        );

    const markers =
        getPlaygroundMarkers(
            filteredPlaygrounds
        );

    const activeFiltersCount =
        countActivePlaygroundFilters(filters);

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
                hoveredMarkerId={hoveredPlaygroundId ?? undefined}
                selectedMarkerId={selectedPlaygroundId ?? undefined}
                focusMarkerId={focusPlaygroundId ?? undefined}
                onMarkerClick={(marker) => setSelectedPlaygroundId(marker.id)}
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
                <span className="playground-filters-toggle__label">
                    <h3>Фильтры</h3>

                    {
                        activeFiltersCount > 0 && (
                            <Badge variant="primary">
                                {activeFiltersCount}
                            </Badge>
                        )
                    }
                </span>

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

            {
                playgrounds.length === 0 ? (
                    <div className="playgrounds-empty-state">
                        <p className="playgrounds-empty-state__title">
                            Площадок пока нет
                        </p>

                        <p className="playgrounds-empty-state__description">
                            Станьте первым, кто добавит площадку для тренировок.
                        </p>

                        <Link to="/playgrounds/add">
                            <Button variant="primary">
                                Добавить площадку
                            </Button>
                        </Link>
                    </div>
                ) : filteredPlaygrounds.length === 0 ? (
                    <div className="playgrounds-empty-state">
                        <p className="playgrounds-empty-state__title">
                            Ничего не найдено
                        </p>

                        <p className="playgrounds-empty-state__description">
                            Попробуйте изменить параметры фильтра.
                        </p>

                        {
                            hasActivePlaygroundFilters(filters) && (
                                <Button
                                    variant="outline"
                                    onClick={() => setFilters(emptyPlaygroundFilters)}
                                >
                                    Сбросить фильтры
                                </Button>
                            )
                        }
                    </div>
                ) : (
                    <>
                        <p className="playgrounds-count">
                            {
                                `Найдено: ${filteredPlaygrounds.length} ${
                                    pluralizeRu(
                                        filteredPlaygrounds.length,
                                        ["площадка", "площадки", "площадок"]
                                    )
                                }`
                            }
                        </p>

                        <div className="playgrounds-list">
                            {
                                filteredPlaygrounds.map((playground) => (
                                    <PlaygroundCard
                                        key={playground.id}

                                        playground={playground}
                                        highlighted={playground.id === selectedPlaygroundId}
                                        onHoverChange={(hovering) =>
                                            setHoveredPlaygroundId(hovering ? playground.id : null)
                                        }
                                        onSelect={() => {
                                            setSelectedPlaygroundId(playground.id);
                                            setFocusPlaygroundId(playground.id);
                                        }}
                                    />
                                ))
                            }
                        </div>
                    </>
                )
            }

        </Section>
    );
}