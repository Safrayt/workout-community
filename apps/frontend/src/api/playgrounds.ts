import { apiFetch } from "./client";
import { dataUrlToFile, isDataUrl } from "./imageUpload";
import {
    mapApiPlaygroundToPlayground,
    mapNewPlaygroundToApi,
    type ApiPlayground,
} from "./mappers/playground";

import type { Playground } from "../types/playground";
import type { NewPlayground } from "../types/newPlayground";
import type { NewPlaygroundPhoto } from "../types/newPlayground";

export async function listPlaygrounds(): Promise<Playground[]> {
    const apiPlaygrounds = await apiFetch<ApiPlayground[]>("/playgrounds/");

    return apiPlaygrounds.map(mapApiPlaygroundToPlayground);
}

export async function getPlayground(id: string): Promise<Playground> {
    const apiPlayground = await apiFetch<ApiPlayground>(
        `/playgrounds/${id}`
    );

    return mapApiPlaygroundToPlayground(apiPlayground);
}

/**
 * Загружает все фото из формы, которые ещё не на сервере (data URL —
 * см. api/imageUpload.ts), на только что созданную/обновлённую
 * площадку. Уже существующие фото (обычный URL с бэкенда) пропускает —
 * они там и так есть, их трогать не нужно.
 */
async function uploadNewPhotos(
    playgroundId: string,
    photos: NewPlaygroundPhoto[]
): Promise<void> {
    for (const photo of photos) {
        if (!isDataUrl(photo.url)) {
            continue;
        }

        const file = dataUrlToFile(photo.url, `${photo.id}.jpg`);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("is_main", String(photo.isMain));

        await apiFetch(`/playgrounds/${playgroundId}/photos`, {
            method: "POST",
            body: formData,
        });
    }
}

/**
 * Приводит фото площадки на сервере в соответствие с тем, что
 * получилось в форме редактирования: удаляет убранные, загружает
 * новые, переключает главное фото при необходимости. Фото — это
 * единственная часть площадки, которая живёт вне PUT /playgrounds/{id}
 * (см. комментарий в api/mappers/playground.ts).
 */
async function syncPhotos(
    playgroundId: string,
    existingPlayground: Playground,
    formPhotos: NewPlaygroundPhoto[]
): Promise<void> {
    const formPhotoIds = new Set(
        formPhotos.filter((p) => !isDataUrl(p.url)).map((p) => p.id)
    );

    // Убранные из формы существующие фото — удаляем на сервере.
    for (const existingPhoto of existingPlayground.photos) {
        if (!formPhotoIds.has(existingPhoto.id)) {
            await apiFetch(
                `/playgrounds/${playgroundId}/photos/${existingPhoto.id}`,
                { method: "DELETE" }
            );
        }
    }

    await uploadNewPhotos(playgroundId, formPhotos);

    // Если главным в форме назначено уже существующее (не новое) фото
    // и на сервере оно ещё не главное — переключаем.
    const mainFormPhoto = formPhotos.find((p) => p.isMain);

    if (mainFormPhoto && !isDataUrl(mainFormPhoto.url)) {
        const wasAlreadyMain = existingPlayground.photos.find(
            (p) => p.id === mainFormPhoto.id
        )?.isMain;

        if (!wasAlreadyMain) {
            await apiFetch(
                `/playgrounds/${playgroundId}/photos/${mainFormPhoto.id}/set-main`,
                { method: "PUT" }
            );
        }
    }
}

export async function createPlayground(
    playground: NewPlayground
): Promise<Playground> {
    const apiPlayground = await apiFetch<ApiPlayground>("/playgrounds/", {
        method: "POST",
        body: mapNewPlaygroundToApi(playground),
    });

    await uploadNewPhotos(String(apiPlayground.id), playground.photos);

    // Перечитываем с сервера — там уже есть загруженные фото
    // и запись "Добавлена" в истории.
    return getPlayground(String(apiPlayground.id));
}

export async function updatePlayground(
    id: string,
    playground: NewPlayground,
    existingPlayground: Playground
): Promise<Playground> {
    await apiFetch<ApiPlayground>(`/playgrounds/${id}`, {
        method: "PUT",
        body: mapNewPlaygroundToApi(playground),
    });

    await syncPhotos(id, existingPlayground, playground.photos);

    return getPlayground(id);
}

export async function deletePlayground(id: string): Promise<void> {
    await apiFetch(`/playgrounds/${id}`, { method: "DELETE" });
}

export async function confirmPlaygroundInspection(
    id: string
): Promise<Playground> {
    const apiPlayground = await apiFetch<ApiPlayground>(
        `/playgrounds/${id}/confirm-inspection`,
        { method: "POST" }
    );

    return mapApiPlaygroundToPlayground(apiPlayground);
}
