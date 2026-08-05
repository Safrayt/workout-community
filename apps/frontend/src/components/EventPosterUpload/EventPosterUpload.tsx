import { useRef, useState } from "react";

import "../../styles/components/event-poster-upload.css";

import { compressImageFile } from "../../utils/files";

type EventPosterUploadProps = {
    posterUrl: string;

    onChange: (posterUrl: string) => void;
};

export default function EventPosterUpload({
    posterUrl,
    onChange,
}: EventPosterUploadProps) {
    const inputRef =
        useRef<HTMLInputElement>(null);

    const [isProcessing, setIsProcessing] =
        useState(false);

    async function handleFileSelected(
        fileList: FileList | null
    ) {
        const file = fileList?.[0];

        if (!file) {
            return;
        }

        setIsProcessing(true);

        try {
            const compressedUrl =
                await compressImageFile(file);

            onChange(compressedUrl);
        } finally {
            setIsProcessing(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    function handleRemove() {
        onChange("");
    }

    return (
        <div className="event-poster-upload">
            {
                posterUrl ? (
                    <div className="event-poster-upload__preview">
                        <img
                            src={posterUrl}
                            alt="Афиша мероприятия"
                            className="event-poster-upload__image"
                        />

                        <button
                            type="button"
                            className="event-poster-upload__remove"
                            onClick={handleRemove}
                        >
                            Удалить афишу
                        </button>
                    </div>
                ) : (
                    <label
                        className={`event-poster-upload__add ${isProcessing ? "event-poster-upload__add--disabled" : ""}`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            disabled={isProcessing}
                            className="event-poster-upload__input"
                            onChange={(event) =>
                                handleFileSelected(
                                    event.target.files
                                )
                            }
                        />

                        <span className="event-poster-upload__add-icon">
                            {isProcessing ? "…" : "+"}
                        </span>

                        <span>
                            {
                                isProcessing
                                    ? "Обработка изображения..."
                                    : "Добавить афишу"
                            }
                        </span>
                    </label>
                )
            }

            <p className="event-poster-upload__hint">
                Необязательно. Желательный формат — квадратный.
            </p>
        </div>
    );
}