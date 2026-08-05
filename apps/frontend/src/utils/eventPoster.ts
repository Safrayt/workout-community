import type { Playground } from "../types/playground";

export function getEventPosterUrl(
    posterUrl: string | undefined,
    playground?: Playground
): string | undefined {
    const playgroundMainPhoto =
        playground?.photos.find((photo) => photo.isMain) ??
        playground?.photos[0];

    return posterUrl ?? playgroundMainPhoto?.url;
}