import { useEffect, useState } from "react";

import "../../styles/components/playground-gallery.css";

import InfoSection from "../ui/InfoSection/InfoSection";

import type { PlaygroundPhoto } from "../../types/playground";

type PlaygroundGalleryProps = {
    photos: PlaygroundPhoto[];
};

export default function PlaygroundGallery({
    photos,
}: PlaygroundGalleryProps) {
    const [
        openedIndex,
        setOpenedIndex,
    ] = useState<number | null>(null);

    const sortedPhotos = [...photos].sort(
        (a, b) => Number(b.isMain) - Number(a.isMain)
    );

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (openedIndex === null) {
                return;
            }

            if (event.key === "Escape") {
                setOpenedIndex(null);
            }

            if (event.key === "ArrowRight") {
                setOpenedIndex(
                    (current) =>
                        current === null
                            ? current
                            : (current + 1) % sortedPhotos.length
                );
            }

            if (event.key === "ArrowLeft") {
                setOpenedIndex(
                    (current) =>
                        current === null
                            ? current
                            : (current - 1 + sortedPhotos.length) % sortedPhotos.length
                );
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openedIndex, sortedPhotos.length]);

    if (sortedPhotos.length === 0) {
        return (
            <InfoSection title="Фотографии">
                <p>
                    Информация отсутствует.
                </p>
            </InfoSection>
        );
    }

    const openedPhoto =
        openedIndex !== null
            ? sortedPhotos[openedIndex]
            : null;

    return (
        <InfoSection title="Фотографии">
            <div className="playground-gallery__grid">
                {
                    sortedPhotos.map((photo, index) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="playground-gallery__thumb"
                            onClick={() => setOpenedIndex(index)}
                        >
                            <img
                                src={photo.url}
                                alt={photo.description ?? "Фотография площадки"}
                            />
                        </button>
                    ))
                }
            </div>

            {
                openedPhoto && (
                    <div
                        className="playground-gallery__lightbox"
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setOpenedIndex(null)}
                    >
                        <button
                            type="button"
                            className="playground-gallery__close"
                            onClick={() => setOpenedIndex(null)}
                            aria-label="Закрыть"
                        >
                            ✕
                        </button>

                        {
                            sortedPhotos.length > 1 && (
                                <button
                                    type="button"
                                    className="playground-gallery__nav playground-gallery__nav--prev"
                                    aria-label="Предыдущее фото"
                                    onClick={(event) => {
                                        event.stopPropagation();

                                        setOpenedIndex(
                                            (current) =>
                                                current === null
                                                    ? current
                                                    : (current - 1 + sortedPhotos.length) % sortedPhotos.length
                                        );
                                    }}
                                >
                                    ←
                                </button>
                            )
                        }

                        <img
                            src={openedPhoto.url}
                            alt={openedPhoto.description ?? "Фотография площадки"}
                            className="playground-gallery__lightbox-image"
                            onClick={(event) => event.stopPropagation()}
                        />

                        {
                            sortedPhotos.length > 1 && (
                                <button
                                    type="button"
                                    className="playground-gallery__nav playground-gallery__nav--next"
                                    aria-label="Следующее фото"
                                    onClick={(event) => {
                                        event.stopPropagation();

                                        setOpenedIndex(
                                            (current) =>
                                                current === null
                                                    ? current
                                                    : (current + 1) % sortedPhotos.length
                                        );
                                    }}
                                >
                                    →
                                </button>
                            )
                        }
                    </div>
                )
            }
        </InfoSection>
    );
}