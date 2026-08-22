/**
 * Фронтенд уже сжимает выбранные фото/афиши в base64 data URL
 * (см. utils/files.ts compressImageFile) и хранит их прямо в форме —
 * так было устроено, когда всё жило в моках. Чтобы не переделывать
 * ни один из существующих компонентов выбора фото
 * (PlaygroundPhotoUpload, EventPosterUpload и их drag/reorder/
 * set-main контролы), конвертируем data URL обратно в File прямо
 * перед отправкой на бэкенд — а не меняем сам способ выбора файла.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, base64Data] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return new File([bytes], filename, { type: mimeType });
}

/** true, если строка — это ещё не загруженное на сервер фото (data
 * URL из compressImageFile), а не URL, уже пришедший с бэкенда. */
export function isDataUrl(url: string): boolean {
    return url.startsWith("data:");
}
