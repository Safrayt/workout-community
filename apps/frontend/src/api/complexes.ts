import { apiFetch } from "./client";
import {
    mapApiComplexToComplex,
    mapApiCompletionToCompletion,
    mapCompletionUpdateToApi,
    mapNewCompletionToApi,
    type ApiComplex,
    type ApiComplexCompletion,
} from "./mappers/complex";

import type { Complex } from "../types/complex";
import type { ComplexCompletion } from "../types/complexCompletion";
import type { NewComplexCompletion } from "../types/newComplexCompletion";

// =====================================================================
// Каталог
// =====================================================================

export async function listComplexes(): Promise<Complex[]> {
    const apiComplexes = await apiFetch<ApiComplex[]>("/complexes/");

    return apiComplexes.map(mapApiComplexToComplex);
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
