import type {
    MapMarker,
} from "../../types/map";

import "../../styles/components/map-popup.css";
import "../../styles/components/map-marker.css";

import MapPicker from "./MapPicker";
import Button from "../ui/Button/Button";
import RatingBadge from "../ui/RatingBadge/RatingBadge";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";


type PlaygroundsMapProps = {
    markers: MapMarker[];

    height?: string;

    onMapClick?: (
        latitude: number,
        longitude: number
    ) => void;

    selectedLatitude?: number;

    selectedLongitude?: number;

    onMarkerClick?: (
        marker: MapMarker
    ) => void;

    showDetailsLink?: boolean;

    /** Текст кнопки-ссылки в popup — по умолчанию "Подробнее". */
    detailsLinkLabel?: string;

    /** id маркера, подсвечиваемого при наведении на карточку в списке. */
    hoveredMarkerId?: string;

    /**
     * id выбранного маркера (клик по карточке или по самому маркеру) —
     * визуально подсвечивается на карте (не панорамирует карту).
     */
    selectedMarkerId?: string;

    /**
     * id маркера, к которому нужно панорамировать карту и открыть его
     * popup — выставляется только при выборе площадки кликом по
     * карточке в списке. Клик по самому маркеру на карте карту не
     * масштабирует и не панорамирует — площадка уже видна на экране.
     */
    focusMarkerId?: string;
};

type MarkerVisualState = "default" | "hovered" | "selected";

const MARKER_ICON_SIZE: Record<MarkerVisualState, number> = {
    default: 16,
    hovered: 22,
    selected: 24,
};

/** Цвет метки по умолчанию — совпадает с --color-primary из variables.css. */
const DEFAULT_MARKER_COLOR = "#2f855a";

function createPlaygroundMarkerIcon(
    state: MarkerVisualState,
    color: string
) {
    const size = MARKER_ICON_SIZE[state];

    const boxShadow =
        state === "selected"
            ? `0 0 0 4px ${color}4D, 0 2px 6px rgba(0, 0, 0, 0.35)`
            : "0 2px 6px rgba(0, 0, 0, 0.35)";

    return L.divIcon({
        className: "playground-marker-icon",
        html: `<span class="playground-marker-icon__dot playground-marker-icon__dot--${state}" style="background-color:${color};box-shadow:${boxShadow};"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function MapClickHandler({
    onMapClick,
    }: {
        onMapClick?: (
            latitude: number,
            longitude: number
        ) => void;
    }) {
        useMapEvents({
            click(event) {
                if (!onMapClick) {
                    return;
                }

                onMapClick(
                    event.latlng.lat,
                    event.latlng.lng
                );
            },
        });

        return null;
    }

/**
 * Панорамирует карту к выбранному маркеру и открывает его popup — только
 * при выборе площадки кликом по карточке в списке (раздел 32 UX-спеки:
 * "Карточка → Карта центрируется → Popup"). Клик по самому маркеру
 * карту не двигает — этот хендлер реагирует на focusMarkerId, а не на
 * selectedMarkerId.
 */
function MapSelectionHandler({
    markers,
    focusMarkerId,
    markerRefs,
}: {
    markers: MapMarker[];
    focusMarkerId?: string;
    markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}) {
    const map = useMap();
    const previousFocusId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (
            !focusMarkerId ||
            focusMarkerId === previousFocusId.current
        ) {
            return;
        }

        previousFocusId.current = focusMarkerId;

        const marker = markers.find(
            (item) => item.id === focusMarkerId
        );

        if (!marker) {
            return;
        }

        map.flyTo(
            [marker.latitude, marker.longitude],
            Math.max(map.getZoom(), 14),
            { duration: 0.6 }
        );

        markerRefs.current[focusMarkerId]?.openPopup();
    }, [focusMarkerId, markers, map, markerRefs]);

    return null;
}


export default function PlaygroundsMap({
    markers,
    height = "500px",
    onMapClick,
    selectedLatitude,
    selectedLongitude,
    onMarkerClick,
    showDetailsLink = true,
    detailsLinkLabel = "Подробнее",
    hoveredMarkerId,
    selectedMarkerId,
    focusMarkerId,
}: PlaygroundsMapProps) {
    const navigate = useNavigate();
    const markerRefs = useRef<Record<string, L.Marker | null>>({});

    return (
        <MapContainer
            center={[53.9, 27.5667]}
            zoom={12}
            style={{
                height,
                width: "100%",
                borderRadius: "12px",
            }}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapPicker
                latitude={selectedLatitude}
                longitude={selectedLongitude}
                onChange={(latitude, longitude) => {
                    onMapClick?.(
                        latitude,
                        longitude
                    );
                }}
            />
            <MapClickHandler
                onMapClick={onMapClick}
            />
            <MapSelectionHandler
                markers={markers}
                focusMarkerId={focusMarkerId}
                markerRefs={markerRefs}
            />
            {markers.map((marker) => {
                const state: MarkerVisualState =
                    marker.id === selectedMarkerId
                        ? "selected"
                        : marker.id === hoveredMarkerId
                            ? "hovered"
                            : "default";

                return (
                    <Marker
                        key={marker.id}
                        position={[
                            marker.latitude,
                            marker.longitude,
                        ]}
                        icon={createPlaygroundMarkerIcon(
                            state,
                            marker.color ?? DEFAULT_MARKER_COLOR
                        )}
                        ref={(instance) => {
                            markerRefs.current[marker.id] = instance;
                        }}
                        eventHandlers={{
                            click: () => {
                                onMarkerClick?.(marker);
                            },
                        }}
                    >
                        <Popup>
                            <div className="map-popup">
                                {
                                    marker.photoUrl && (
                                        <div className="map-popup__photo-wrapper">
                                            <img
                                                src={marker.photoUrl}
                                                alt={marker.title}
                                                className="map-popup__image"
                                            />

                                            {
                                                marker.rating !== undefined && (
                                                    <div className="map-popup__rating">
                                                        <RatingBadge
                                                            rating={marker.rating}
                                                            showMax={false}
                                                        />
                                                    </div>
                                                )
                                            }
                                        </div>
                                    )
                                }

                                <div className="map-popup__body">
                                    <p className="map-popup__title">
                                        {marker.title}
                                    </p>

                                    {
                                        marker.locality && (
                                            <p className="map-popup__locality">
                                                {marker.locality}
                                            </p>
                                        )
                                    }

                                    <div className="map-popup__meta">
                                        {
                                            !marker.photoUrl &&
                                            marker.rating !== undefined && (
                                                <RatingBadge
                                                    rating={marker.rating}
                                                    showMax={false}
                                                />
                                            )
                                        }

                                        {
                                            marker.shortInfo && (
                                                <span className="map-popup__short-info">
                                                    {marker.shortInfo}
                                                </span>
                                            )
                                        }
                                    </div>

                                    {
                                        showDetailsLink && (
                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(marker.url)}
                                            >
                                                {detailsLinkLabel}
                                            </Button>
                                        )
                                    }
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}