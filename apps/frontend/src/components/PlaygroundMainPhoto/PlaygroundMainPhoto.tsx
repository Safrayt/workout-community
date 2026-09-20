import { useState } from "react";

import "../../styles/components/playground-main-photo.css";

import PlaygroundsMap from "../Map/PlaygroundsMap";

import type { PlaygroundPhoto } from "../../types/playground";
import type { MapMarker } from "../../types/map";

type PlaygroundMainPhotoProps = {
    photos: PlaygroundPhoto[];

    playgroundName: string;

    playgroundId: string;

    latitude: number;

    longitude: number;
};

type PlaygroundMainView = "photo" | "map";

/**
 * Верхний блок страницы площадки — фото или карта её местоположения,
 * переключается тумблером под ним. По умолчанию открыта фотография
 * (если она вообще есть — площадка теперь не может быть создана без
 * фото, но у площадок, добавленных раньше, фото может не быть).
 * Когда фото нет, тумблер не нужен — сразу и без вариантов
 * показываем карту.
 */
export default function PlaygroundMainPhoto({
    photos,
    playgroundName,
    playgroundId,
    latitude,
    longitude,
}: PlaygroundMainPhotoProps) {
    const mainPhoto = photos.find((photo) => photo.isMain) ?? photos[0];

    const [view, setView] = useState<PlaygroundMainView>("photo");

    if (!mainPhoto) {
        return (
            <div className="playground-main-photo">
                <PlaygroundLocationMap
                    playgroundId={playgroundId}
                    playgroundName={playgroundName}
                    latitude={latitude}
                    longitude={longitude}
                />
            </div>
        );
    }

    return (
        <div className="playground-main-photo">
            {
                view === "photo" ? (
                    <img
                        src={mainPhoto.url}
                        alt={mainPhoto.description ?? playgroundName}
                        className="playground-main-photo__image"
                    />
                ) : (
                    <PlaygroundLocationMap
                        playgroundId={playgroundId}
                        playgroundName={playgroundName}
                        latitude={latitude}
                        longitude={longitude}
                    />
                )
            }

            <div
                className="playground-main-photo__toggle"
                role="tablist"
                aria-label="Показать фотографию или карту"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={view === "photo"}
                    className={`playground-main-photo__toggle-button ${
                        view === "photo"
                            ? "playground-main-photo__toggle-button--active"
                            : ""
                    }`}
                    onClick={() => setView("photo")}
                >
                    Фотография
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={view === "map"}
                    className={`playground-main-photo__toggle-button ${
                        view === "map"
                            ? "playground-main-photo__toggle-button--active"
                            : ""
                    }`}
                    onClick={() => setView("map")}
                >
                    Карта
                </button>
            </div>
        </div>
    );
}

function PlaygroundLocationMap({
    playgroundId,
    playgroundName,
    latitude,
    longitude,
}: {
    playgroundId: string;
    playgroundName: string;
    latitude: number;
    longitude: number;
}) {
    const marker: MapMarker = {
        id: playgroundId,
        title: playgroundName,
        latitude,
        longitude,
        url: `/playgrounds/${playgroundId}`,
    };

    return (
        <div className="playground-main-photo__map">
            <PlaygroundsMap
                markers={[marker]}
                height="100%"
                initialCenter={[latitude, longitude]}
                initialZoom={15}
                showDetailsLink={false}
            />
        </div>
    );
}
