import {
    Marker,
    useMapEvents,
} from "react-leaflet";

import L from "leaflet";

type MapPickerProps = {
    latitude?: number;
    longitude?: number;
    onChange: (
        latitude: number,
        longitude: number
    ) => void;
};

export default function MapPicker({
    latitude,
    longitude,
    onChange,
}: MapPickerProps) {

    useMapEvents({
        click(event) {
            onChange(
                event.latlng.lat,
                event.latlng.lng
            );
        },
    });

    if (
        latitude === undefined ||
        longitude === undefined
    ) {
        return null;
    }

    return (
        <Marker
            position={[
                latitude,
                longitude,
            ]}
            icon={
                new L.Icon.Default()
            }
        />
    );
}