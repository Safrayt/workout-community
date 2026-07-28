export type ReverseGeocodeResult = {
    locality: string;

    address: string;
};


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
            data.display_name ?? "",
    };
}