import type {
    MapMarker,
} from "../../types/map";

import "../../styles/components/map-popup.css";

import MapPicker from "./MapPicker";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
} from "react-leaflet";

import { useNavigate } from "react-router-dom";


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
};

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


export default function PlaygroundsMap({
    markers,
    height = "500px",
    onMapClick,
    selectedLatitude,
    selectedLongitude,
    onMarkerClick,
    showDetailsLink = true,
}: PlaygroundsMapProps) {
    const navigate = useNavigate();
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
            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    position={[
                        marker.latitude,
                        marker.longitude,
                    ]}
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
                                    <img
                                        src={marker.photoUrl}
                                        alt={marker.title}
                                        className="map-popup__image"
                                    />
                                )
                            }

                            <p className="map-popup__title">
                                {marker.title}
                            </p>

                            {
                                showDetailsLink && (
                                    <button
                                        type="button"
                                        className="map-popup__button"
                                        onClick={() => navigate(marker.url)}
                                    >
                                        Подробнее
                                    </button>
                                )
                            }
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}