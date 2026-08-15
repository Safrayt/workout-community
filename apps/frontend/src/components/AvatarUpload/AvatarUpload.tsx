import { useRef, useState } from "react";

import Avatar from "../ui/Avatar/Avatar";

import "../../styles/components/avatar-upload.css";

import { compressImageFile } from "../../utils/files";

type AvatarUploadProps = {
    username: string;

    avatarUrl?: string;

    onChange: (avatarUrl: string) => void;
};

/**
 * Загрузка/замена/удаление аватара в редактировании профиля
 * (UX-PROFILE §7, §32). Обрезка и позиционирование из §32 для MVP
 * сознательно не реализованы — достаточно квадратной компрессии
 * изображения перед сохранением, как это уже сделано для афиш
 * событий и фото площадок.
 */
export default function AvatarUpload({
    username,
    avatarUrl,
    onChange,
}: AvatarUploadProps) {
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
        <div className="avatar-upload">
            <Avatar
                name={username}
                avatarUrl={avatarUrl}
                size="lg"
            />

            <div className="avatar-upload__actions">
                <label
                    className={`avatar-upload__button ${isProcessing ? "avatar-upload__button--disabled" : ""}`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        disabled={isProcessing}
                        className="avatar-upload__input"
                        onChange={(event) =>
                            handleFileSelected(
                                event.target.files
                            )
                        }
                    />

                    {
                        isProcessing
                            ? "Обработка..."
                            : avatarUrl
                                ? "Заменить"
                                : "Загрузить фото"
                    }
                </label>

                {
                    avatarUrl && (
                        <button
                            type="button"
                            className="avatar-upload__remove"
                            onClick={handleRemove}
                        >
                            Удалить
                        </button>
                    )
                }
            </div>
        </div>
    );
}
