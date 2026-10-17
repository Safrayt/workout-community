import { compressImageFile, dataUrlToFile } from "./files";

/** Совпадает с ALLOWED_IMAGE_FORMATS в app/files.py. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Совпадает с MAX_FILE_SIZE_BYTES в app/files.py. */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Файлы крупнее заранее сжимаются в браузере (фото с телефона бывает 5–10 МБ). */
const COMPRESS_ABOVE_BYTES = 2 * 1024 * 1024;

/** Сервер всё равно уменьшает картинки до 1920 px по длинной стороне. */
const MAX_DIMENSION_PX = 1920;
const JPEG_QUALITY = 0.85;

/**
 * Готовит выбранную картинку к загрузке в статью: проверяет формат и
 * размер, а крупные файлы сжимает. Бросает Error с понятным текстом.
 */
export async function prepareArticleImage(file: File): Promise<File> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Допустимы только изображения jpeg, png и webp");
    }

    let prepared = file;

    if (file.size > COMPRESS_ABOVE_BYTES) {
        const dataUrl = await compressImageFile(
            file,
            MAX_DIMENSION_PX,
            JPEG_QUALITY
        );

        prepared = dataUrlToFile(dataUrl, "image.jpg");
    }

    if (prepared.size > MAX_SIZE_BYTES) {
        throw new Error("Файл слишком большой (максимум 5 МБ)");
    }

    return prepared;
}
