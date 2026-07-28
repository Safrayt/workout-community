import {
    MapContainer,
    TileLayer,
} from "react-leaflet";

import type {
    MapMarker,
} from "../../types/map";

import {
    Marker,
    Popup,
} from "react-leaflet";

import { useNavigate } from "react-router-dom";


type PlaygroundsMapProps = {
    markers: MapMarker[];

    height?: number;
};


export default function PlaygroundsMap({
    markers,
    height = 500,
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
            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    position={[
                        marker.latitude,
                        marker.longitude,
                    ]}
                    eventHandlers={{
                        click: () => {
                            navigate(marker.url);
                        },
                    }}
                >
                    <Popup>
                        {marker.title}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}