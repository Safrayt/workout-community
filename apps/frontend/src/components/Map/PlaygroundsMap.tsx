import type {
    MapMarker,
} from "../../types/map";

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
                            if (onMarkerClick) {
                                onMarkerClick(marker);
                                return;
                            }

                            navigate(marker.url);
                        },
                    }}
                >
                    <Popup>
                        {
                            marker.photoUrl && (
                                <img
                                    src={marker.photoUrl}
                                    alt={marker.title}
                                    style={{
                                        width: "160px",
                                        height: "120px",
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                        display: "block",
                                        marginBottom: "6px",
                                    }}
                                />
                            )
                        }

                        {marker.title}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}