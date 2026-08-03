export type ReverseGeocodeResult = {
    locality: string;

    address: string;
};

function buildShortAddress(
    address: Record<string, string | undefined>
) {
    const district =
        address.suburb ??
        address.city_district ??
        address.district ??
        address.neighbourhood;

    return [
        district,
        address.road,
        address.house_number,
    ]
        .filter(
            (part): part is string => Boolean(part)
        )
        .join(", ");
}

export async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<ReverseGeocodeResult> {

    const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latitude}` +
        `&lon=${longitude}` +
        `&format=jsonv2`;

    const response =
        await fetch(
            url,
            {
                headers: {
                    Accept: "application/json",
                },
            }
        );

    if (!response.ok) {
        throw new Error(
            "Unable to load address."
        );
    }

    const data =
        await response.json();

    return {
        locality:
            data.address.city ??
            data.address.town ??
            data.address.village ??
            data.address.hamlet ??
            "",

        address:
            buildShortAddress(data.address ?? {}),
    };
}