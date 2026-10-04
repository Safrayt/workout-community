export function readFileAsDataUrl(
    file: File
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result as string);
        };

        reader.onerror = () => {
            reject(
                new Error("Не удалось прочитать файл.")
            );
        };

        reader.readAsDataURL(file);
    });
}

const MAX_IMAGE_DIMENSION = 1280;

const IMAGE_QUALITY = 0.8;

function loadImage(
    dataUrl: string
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);

        image.onerror = () => reject(
            new Error("Не удалось обработать изображение.")
        );

        image.src = dataUrl;
    });
}

export async function compressImageFile(
    file: File,
    maxDimension: number = MAX_IMAGE_DIMENSION,
    quality: number = IMAGE_QUALITY
): Promise<string> {
    const originalDataUrl =
        await readFileAsDataUrl(file);

    const image =
        await loadImage(originalDataUrl);

    const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
    );

    const targetWidth =
        Math.round(image.width * scale);

    const targetHeight =
        Math.round(image.height * scale);

    const canvas =
        document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context =
        canvas.getContext("2d");

    if (!context) {
        return originalDataUrl;
    }

    context.drawImage(
        image,
        0,
        0,
        targetWidth,
        targetHeight
    );

    return canvas.toDataURL(
        "image/jpeg",
        quality
    );
}

/**
 * Превращает data-URL (например, результат compressImageFile) обратно в
 * файл — для отправки на сервер обычной загрузкой (multipart), а не
 * строкой внутри JSON.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, base64] = dataUrl.split(",");
    const mimeType = /data:([^;]+)/.exec(header)?.[1] ?? "image/jpeg";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], filename, { type: mimeType });
}
