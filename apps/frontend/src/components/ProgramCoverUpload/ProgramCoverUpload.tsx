import { useRef, useState } from "react";

import "../../styles/components/program-cover-upload.css";

import { compressImageFile } from "../../utils/files";

type ProgramCoverUploadProps = {
    coverUrl: string;

    onChange: (coverUrl: string) => void;
};

export default function ProgramCoverUpload({
    coverUrl,
    onChange,
}: ProgramCoverUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    async function handleFileSelected(fileList: FileList | null) {
        const file = fileList?.[0];

        if (!file) {
            return;
        }

        setIsProcessing(true);

        try {
            const compressedUrl = await compressImageFile(file);

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
        <div className="program-cover-upload">
            {
                coverUrl ? (
                    <div className="program-cover-upload__preview">
                        <img
                            src={coverUrl}
                            alt="Обложка программы"
                            className="program-cover-upload__image"
                        />

                        <button
                            type="button"
                            className="program-cover-upload__remove"
                            onClick={handleRemove}
                        >
                            Удалить обложку
                        </button>
                    </div>
                ) : (
                    <label
                        className={`program-cover-upload__add ${isProcessing ? "program-cover-upload__add--disabled" : ""}`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            disabled={isProcessing}
                            className="program-cover-upload__input"
                            onChange={(event) =>
                                handleFileSelected(event.target.files)
                            }
                        />

                        <span className="program-cover-upload__add-icon">
                            {isProcessing ? "…" : "+"}
                        </span>

                        <span>
                            {
                                isProcessing
                                    ? "Обработка изображения..."
                                    : "Добавить обложку"
                            }
                        </span>
                    </label>
                )
            }

            <p className="program-cover-upload__hint">
                Можно не добавлять. Желательный формат — горизонтальный, 16:9.
            </p>
        </div>
    );
}
