import { useRef, useState } from "react";

import "../../styles/components/playground-photo-upload.css";

import { compressImageFile } from "../../utils/files";

import type {
    NewWorkoutEntryPhoto,
} from "../../types/newWorkoutEntry";

type WorkoutEntryPhotoUploadProps = {
    photos: NewWorkoutEntryPhoto[];

    maxPhotos: number;

    onChange: (photos: NewWorkoutEntryPhoto[]) => void;

    error?: string;
};

/**
 * Загрузка фотографий тренировки (UX: до 5 штук на запись).
 *
 * Как и у площадок, фотографии сжимаются на клиенте перед
 * сохранением (см. utils/files.ts, compressImageFile), чтобы не
 * раздувать локальное хранилище. Одну из фотографий можно отметить
 * как главную — именно она используется как миниатюра записи в
 * списке дневника (WorkoutEntryCard). Если главная фотография не
 * выбрана явно, ей автоматически становится первая загруженная —
 * так миниатюра в списке никогда не остаётся пустой без причины.
 */
export default function WorkoutEntryPhotoUpload({
    photos,
    maxPhotos,
    onChange,
    error,
}: WorkoutEntryPhotoUploadProps) {
    const inputRef =
        useRef<HTMLInputElement>(null);

    const [isProcessing, setIsProcessing] =
        useState(false);

    const remainingSlots =
        maxPhotos - photos.length;

    async function handleFilesSelected(
        fileList: FileList | null
    ) {
        if (!fileList || fileList.length === 0) {
            return;
        }

        const files =
            Array.from(fileList).slice(
                0,
                remainingSlots
            );

        setIsProcessing(true);

        try {
            const newPhotos = await Promise.all(
                files.map(async (file) => ({
                    id: crypto.randomUUID(),
                    url: await compressImageFile(file),
                    isMain: false,
                }))
            );

            const updatedPhotos = [
                ...photos,
                ...newPhotos,
            ];

            if (
                !updatedPhotos.some((photo) => photo.isMain) &&
                updatedPhotos.length > 0
            ) {
                updatedPhotos[0] = {
                    ...updatedPhotos[0],
                    isMain: true,
                };
            }

            onChange(updatedPhotos);
        } finally {
            setIsProcessing(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    function handleRemove(id: string) {
        const removedPhoto = photos.find(
            (photo) => photo.id === id
        );

        const updatedPhotos = photos.filter(
            (photo) => photo.id !== id
        );

        if (
            removedPhoto?.isMain &&
            updatedPhotos.length > 0
        ) {
            updatedPhotos[0] = {
                ...updatedPhotos[0],
                isMain: true,
            };
        }

        onChange(updatedPhotos);
    }

    function handleSetMain(id: string) {
        onChange(
            photos.map((photo) => ({
                ...photo,
                isMain: photo.id === id,
            }))
        );
    }

    function handleMove(
        index: number,
        direction: -1 | 1
    ) {
        const targetIndex = index + direction;

        if (
            targetIndex < 0 ||
            targetIndex >= photos.length
        ) {
            return;
        }

        const updatedPhotos = [...photos];

        [
            updatedPhotos[index],
            updatedPhotos[targetIndex],
        ] = [
            updatedPhotos[targetIndex],
            updatedPhotos[index],
        ];

        onChange(updatedPhotos);
    }

    return (
        <div className="photo-upload">
            <div className="photo-upload__grid">
                {
                    photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="photo-upload__item"
                        >
                            <img
                                src={photo.url}
                                alt="Фотография тренировки"
                                className="photo-upload__image"
                            />

                            {
                                photo.isMain && (
                                    <span className="photo-upload__main-badge">
                                        Главная
                                    </span>
                                )
                            }

                            <div className="photo-upload__controls">
                                <button
                                    type="button"
                                    className="photo-upload__control"
                                    disabled={photo.isMain}
                                    onClick={() => handleSetMain(photo.id)}
                                >
                                    {
                                        photo.isMain
                                            ? "Главная"
                                            : "Сделать главной"
                                    }
                                </button>

                                <div className="photo-upload__order-controls">
                                    <button
                                        type="button"
                                        className="photo-upload__control photo-upload__control--icon"
                                        disabled={index === 0}
                                        onClick={() => handleMove(index, -1)}
                                        aria-label="Переместить левее"
                                    >
                                        ←
                                    </button>

                                    <button
                                        type="button"
                                        className="photo-upload__control photo-upload__control--icon"
                                        disabled={index === photos.length - 1}
                                        onClick={() => handleMove(index, 1)}
                                        aria-label="Переместить правее"
                                    >
                                        →
                                    </button>

                                    <button
                                        type="button"
                                        className="photo-upload__control photo-upload__control--danger"
                                        onClick={() => handleRemove(photo.id)}
                                        aria-label="Удалить фотографию"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                }

                {
                    remainingSlots > 0 && (
                        <label
                            className={`photo-upload__add ${isProcessing ? "photo-upload__add--disabled" : ""}`}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={isProcessing}
                                className="photo-upload__input"
                                onChange={(event) =>
                                    handleFilesSelected(
                                        event.target.files
                                    )
                                }
                            />

                            <span className="photo-upload__add-icon">
                                {isProcessing ? "…" : "+"}
                            </span>

                            <span>
                                {
                                    isProcessing
                                        ? "Обработка фото..."
                                        : "Добавить фото"
                                }
                            </span>
                        </label>
                    )
                }
            </div>

            <p className="photo-upload__hint">
                Можно загрузить до {maxPhotos} фотографий.
                {" "}
                {photos.length}/{maxPhotos} загружено.
            </p>

            {
                error && (
                    <small className="input__error">
                        {error}
                    </small>
                )
            }
        </div>
    );
}
