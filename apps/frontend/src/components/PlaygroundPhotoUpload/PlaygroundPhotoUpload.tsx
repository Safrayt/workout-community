import { useRef } from "react";

import "../../styles/components/playground-photo-upload.css";

import { readFileAsDataUrl } from "../../utils/files";

import type { NewPlaygroundPhoto } from "../../types/newPlayground";

type PlaygroundPhotoUploadProps = {
    photos: NewPlaygroundPhoto[];

    maxPhotos: number;

    onChange: (photos: NewPlaygroundPhoto[]) => void;

    error?: string;
};

export default function PlaygroundPhotoUpload({
    photos,
    maxPhotos,
    onChange,
    error,
}: PlaygroundPhotoUploadProps) {
    const inputRef =
        useRef<HTMLInputElement>(null);

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

        const newPhotos = await Promise.all(
            files.map(async (file) => ({
                id: crypto.randomUUID(),
                url: await readFileAsDataUrl(file),
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

        if (inputRef.current) {
            inputRef.current.value = "";
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
                                alt="Фотография площадки"
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
                        <label className="photo-upload__add">
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="photo-upload__input"
                                onChange={(event) =>
                                    handleFilesSelected(
                                        event.target.files
                                    )
                                }
                            />

                            <span className="photo-upload__add-icon">
                                +
                            </span>

                            <span>
                                Добавить фото
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