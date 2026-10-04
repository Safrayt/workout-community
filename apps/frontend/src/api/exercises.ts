import { apiFetch } from "./client";
import {
    mapApiExerciseToExercise,
    mapNewExerciseToApi,
    type ApiExercise,
} from "./mappers/exercise";

import type { Exercise } from "../types/exercise";
import type { NewExercise } from "../types/newExercise";

export async function listExercises(): Promise<Exercise[]> {
    const apiExercises = await apiFetch<ApiExercise[]>("/exercises/");

    return apiExercises.map(mapApiExerciseToExercise);
}

/**
 * Всё, что ниже и меняет данные, — только для администратора (403 от
 * бэкенда для остальных, см. ensure_admin в app/routers/exercises.py).
 * Кнопки в интерфейсе скрыты от остальных, но источник правды по
 * правам — сервер.
 */
export async function createExercise(data: NewExercise): Promise<Exercise> {
    const api = await apiFetch<ApiExercise>("/exercises/", {
        method: "POST",
        body: mapNewExerciseToApi(data),
    });

    return mapApiExerciseToExercise(api);
}

export async function updateExercise(
    id: string,
    data: NewExercise
): Promise<Exercise> {
    const api = await apiFetch<ApiExercise>(`/exercises/${id}`, {
        method: "PUT",
        body: mapNewExerciseToApi(data),
    });

    return mapApiExerciseToExercise(api);
}

export async function deleteExercise(id: string): Promise<void> {
    await apiFetch<void>(`/exercises/${id}`, { method: "DELETE" });
}

async function uploadFile(
    id: string,
    kind: "photo" | "video",
    file: File
): Promise<Exercise> {
    const formData = new FormData();

    formData.append("file", file);

    const api = await apiFetch<ApiExercise>(`/exercises/${id}/${kind}`, {
        method: "PUT",
        body: formData,
    });

    return mapApiExerciseToExercise(api);
}

export function uploadExercisePhoto(id: string, file: File) {
    return uploadFile(id, "photo", file);
}

export function uploadExerciseVideo(id: string, file: File) {
    return uploadFile(id, "video", file);
}

export async function deleteExercisePhoto(id: string): Promise<Exercise> {
    const api = await apiFetch<ApiExercise>(`/exercises/${id}/photo`, {
        method: "DELETE",
    });

    return mapApiExerciseToExercise(api);
}

export async function deleteExerciseVideo(id: string): Promise<Exercise> {
    const api = await apiFetch<ApiExercise>(`/exercises/${id}/video`, {
        method: "DELETE",
    });

    return mapApiExerciseToExercise(api);
}
