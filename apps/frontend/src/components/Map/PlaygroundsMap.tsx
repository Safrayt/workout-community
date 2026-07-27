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


type PlaygroundsMapProps = {
    markers: MapMarker[];

    height?: number;
};


export default function PlaygroundsMap({
    markers,
    height = 500,
}: PlaygroundsMapProps) {
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
                >
                    <Popup>
                        {marker.title}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}