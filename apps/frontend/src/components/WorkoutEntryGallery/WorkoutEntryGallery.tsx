import { useEffect, useState } from "react";

import "../../styles/components/workout-entry-gallery.css";

import type {
    WorkoutEntryPhoto,
} from "../../types/workoutEntry";

type Props = {

    photos?: WorkoutEntryPhoto[];

};

/**
 * Галерея фотографий тренировки на странице просмотра записи.
 *
 * Второстепенный блок, как и WorkoutEntryTags: если фотографий нет,
 * блок полностью скрывается — отдельный empty state не нужен.
 * Открытие фото — полноэкранный lightbox с навигацией стрелками
 * клавиатуры (Esc/←/→), по аналогии с PlaygroundGallery.
 */
export default function WorkoutEntryGallery({
    photos,
}: Props) {

    const [
        openedIndex,
        setOpenedIndex,
    ] = useState<number | null>(null);

    const sortedPhotos = photos
        ? [...photos].sort(
            (a, b) => Number(b.isMain) - Number(a.isMain)
        )
        : undefined;

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
                        current === null || !sortedPhotos
                            ? current
                            : (current + 1) % sortedPhotos.length
                );
            }

            if (event.key === "ArrowLeft") {
                setOpenedIndex(
                    (current) =>
                        current === null || !sortedPhotos
                            ? current
                            : (current - 1 + sortedPhotos.length) % sortedPhotos.length
                );
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openedIndex, sortedPhotos]);

    if (!sortedPhotos || sortedPhotos.length === 0) {
        return null;
    }

    const openedPhoto =
        openedIndex !== null
            ? sortedPhotos[openedIndex]
            : null;

    return (

        <section className="workout-entry-gallery">

            <h2 className="workout-entry-gallery__title">
                Фотографии
            </h2>

            <div className="workout-entry-gallery__grid">
                {
                    sortedPhotos.map((photo, index) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="workout-entry-gallery__thumb"
                            onClick={() => setOpenedIndex(index)}
                        >
                            <img
                                src={photo.url}
                                alt="Фотография тренировки"
                            />
                        </button>
                    ))
                }
            </div>

            {
                openedPhoto && (
                    <div
                        className="workout-entry-gallery__lightbox"
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setOpenedIndex(null)}
                    >
                        <button
                            type="button"
                            className="workout-entry-gallery__close"
                            onClick={() => setOpenedIndex(null)}
                            aria-label="Закрыть"
                        >
                            ✕
                        </button>

                        {
                            sortedPhotos.length > 1 && (
                                <button
                                    type="button"
                                    className="workout-entry-gallery__nav workout-entry-gallery__nav--prev"
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
                            alt="Фотография тренировки"
                            className="workout-entry-gallery__lightbox-image"
                            onClick={(event) => event.stopPropagation()}
                        />

                        {
                            sortedPhotos.length > 1 && (
                                <button
                                    type="button"
                                    className="workout-entry-gallery__nav workout-entry-gallery__nav--next"
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

        </section>

    );

}
