import { apiFetch } from "./client";
import {
    mapApiCommentToComment,
    mapApiComplexToComplex,
    mapApiCompletionToCompletion,
    mapCompletionUpdateToApi,
    mapNewCompletionToApi,
    mapNewComplexToApi,
    type ApiComplex,
    type ApiComplexComment,
    type ApiComplexCompletion,
} from "./mappers/complex";

import type { Complex } from "../types/complex";
import type { ComplexComment } from "../types/complexComment";
import type { ComplexCompletion } from "../types/complexCompletion";
import type { NewComplex } from "../types/newComplex";
import type { NewComplexCompletion } from "../types/newComplexCompletion";

// =====================================================================
// Каталог
// =====================================================================

export async function listComplexes(): Promise<Complex[]> {
    const apiComplexes = await apiFetch<ApiComplex[]>("/complexes/");

    return apiComplexes.map(mapApiComplexToComplex);
}

/**
 * Создание и редактирование — только для администратора (403 от
 * бэкенда для остальных, см. ensure_admin в app/routers/complexes.py).
 * Форма (ComplexForm) уже проверяет это на уровне UI, но именно
 * сервер — источник правды по правам доступа.
 */
export async function createComplex(complex: NewComplex): Promise<Complex> {
    const apiComplex = await apiFetch<ApiComplex>("/complexes/", {
        method: "POST",
        body: mapNewComplexToApi(complex),
    });

    return mapApiComplexToComplex(apiComplex);
}

export async function updateComplex(
    id: string,
    complex: NewComplex
): Promise<Complex> {
    // id в теле PUT не нужен и не ожидается (см. ComplexUpdate в
    // app/models_complex.py) — сама запись определяется id в URL,
    // а менять "адрес" уже существующего комплекса нельзя (см.
    // комментарий у ComplexUpdate).
    const { id: _unusedId, ...rest } = mapNewComplexToApi(complex);

    const apiComplex = await apiFetch<ApiComplex>(`/complexes/${id}`, {
        method: "PUT",
        body: rest,
    });

    return mapApiComplexToComplex(apiComplex);
}

export async function getComplex(id: string): Promise<Complex> {
    const apiComplex = await apiFetch<ApiComplex>(`/complexes/${id}`);

    return mapApiComplexToComplex(apiComplex);
}

// =====================================================================
// Выполнения
// =====================================================================

export async function listCompletions(
    complexId: string
): Promise<ComplexCompletion[]> {
    const apiCompletions = await apiFetch<ApiComplexCompletion[]>(
        `/complexes/${complexId}/completions`
    );

    return apiCompletions.map(mapApiCompletionToCompletion);
}

export async function getBestCompletion(
    complexId: string
): Promise<ComplexCompletion | undefined> {
    const apiCompletion = await apiFetch<ApiComplexCompletion | null>(
        `/complexes/${complexId}/best`
    );

    return apiCompletion
        ? mapApiCompletionToCompletion(apiCompletion)
        : undefined;
}

export async function createCompletion(
    complexId: string,
    completion: NewComplexCompletion
): Promise<ComplexCompletion> {
    const apiCompletion = await apiFetch<ApiComplexCompletion>(
        `/complexes/${complexId}/completions`,
        {
            method: "POST",
            body: mapNewCompletionToApi(completion),
        }
    );

    return mapApiCompletionToCompletion(apiCompletion);
}

export async function updateCompletion(
    id: string,
    completion: Partial<NewComplexCompletion>,
    clearDiaryEntry: boolean = false
): Promise<ComplexCompletion> {
    const apiCompletion = await apiFetch<ApiComplexCompletion>(
        `/complexes/completions/${id}`,
        {
            method: "PUT",
            body: mapCompletionUpdateToApi(completion, clearDiaryEntry),
        }
    );

    return mapApiCompletionToCompletion(apiCompletion);
}

export async function deleteCompletion(id: string): Promise<void> {
    await apiFetch(`/complexes/completions/${id}`, { method: "DELETE" });
}

export async function listCompletionsForDiaryEntry(
    entryId: string
): Promise<ComplexCompletion[]> {
    const apiCompletions = await apiFetch<ApiComplexCompletion[]>(
        `/complexes/completions/by-entry/${entryId}`
    );

    return apiCompletions.map(mapApiCompletionToCompletion);
}

// =====================================================================
// Комментарии
// =====================================================================

export async function listComplexComments(
    complexId: string
): Promise<ComplexComment[]> {
    const apiComments = await apiFetch<ApiComplexComment[]>(
        `/complexes/${complexId}/comments`
    );

    return apiComments.map(mapApiCommentToComment);
}

export async function createComplexComment(
    complexId: string,
    text: string
): Promise<ComplexComment> {
    const apiComment = await apiFetch<ApiComplexComment>(
        `/complexes/${complexId}/comments`,
        {
            method: "POST",
            body: { text },
        }
    );

    return mapApiCommentToComment(apiComment);
}

export async function updateComplexComment(
    id: string,
    text: string
): Promise<ComplexComment> {
    const apiComment = await apiFetch<ApiComplexComment>(
        `/complexes/comments/${id}`,
        {
            method: "PUT",
            body: { text },
        }
    );

    return mapApiCommentToComment(apiComment);
}

export async function deleteComplexComment(id: string): Promise<void> {
    await apiFetch(`/complexes/comments/${id}`, { method: "DELETE" });
}
