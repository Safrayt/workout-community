import { apiFetch, buildQuery } from "./client";
import { dataUrlToFile, isDataUrl } from "./imageUpload";
import {
    mapApiProgramCommentToComment,
    mapApiProgramToProgram,
    mapApiVersionSummaryToSummary,
    mapApiVersionToVersion,
    mapNewProgramToApi,
    mapStructureToApi,
    type ApiProgram,
    type ApiProgramComment,
    type ApiProgramVersion,
    type ApiProgramVersionSummary,
} from "./mappers/program";

import type { NewProgram } from "../types/newProgram";
import type {
    Program,
    ProgramDifficulty,
    ProgramStructure,
    ProgramVersion,
    ProgramVersionSummary,
} from "../types/program";
import type { ProgramComment } from "../types/programComment";

// =====================================================================
// Каталог
// =====================================================================

export async function listPrograms(
    difficulty?: ProgramDifficulty
): Promise<Program[]> {
    const apiPrograms = await apiFetch<ApiProgram[]>(
        `/programs/${buildQuery({ difficulty })}`
    );

    return apiPrograms.map(mapApiProgramToProgram);
}

export async function listMyPrograms(): Promise<Program[]> {
    const apiPrograms = await apiFetch<ApiProgram[]>("/programs/mine");

    return apiPrograms.map(mapApiProgramToProgram);
}

export async function getProgram(id: string): Promise<Program> {
    const apiProgram = await apiFetch<ApiProgram>(`/programs/${id}`);

    return mapApiProgramToProgram(apiProgram);
}

/**
 * Обложка грузится отдельным multipart-запросом (как афиша
 * мероприятия, см. api/events.ts) — вызывается уже после того, как
 * сама программа создана/обновлена и у неё точно есть id.
 */
async function uploadProgramCoverIfNeeded(
    programId: string,
    coverUrl: string
): Promise<void> {
    if (!isDataUrl(coverUrl)) {
        return;
    }

    const file = dataUrlToFile(coverUrl, "cover.jpg");
    const formData = new FormData();
    formData.set("file", file);

    await apiFetch(`/programs/${programId}/cover`, {
        method: "POST",
        body: formData,
    });
}

export async function createProgram(program: NewProgram): Promise<Program> {
    const apiProgram = await apiFetch<ApiProgram>("/programs/", {
        method: "POST",
        body: mapNewProgramToApi(program),
    });

    if (program.coverUrl) {
        await uploadProgramCoverIfNeeded(String(apiProgram.id), program.coverUrl);

        return getProgram(String(apiProgram.id));
    }

    return mapApiProgramToProgram(apiProgram);
}

export async function updateProgram(
    id: string,
    program: NewProgram,
    existingProgram?: Program
): Promise<Program> {
    await apiFetch<ApiProgram>(`/programs/${id}`, {
        method: "PUT",
        body: mapNewProgramToApi(program),
    });

    const hadCover = Boolean(existingProgram?.coverUrl);
    const wantsCover = Boolean(program.coverUrl);

    if (wantsCover && isDataUrl(program.coverUrl!)) {
        await uploadProgramCoverIfNeeded(id, program.coverUrl!);
    } else if (hadCover && !wantsCover) {
        await apiFetch(`/programs/${id}/cover`, { method: "DELETE" });
    }

    return getProgram(id);
}

export async function deleteProgram(id: string): Promise<void> {
    await apiFetch(`/programs/${id}`, { method: "DELETE" });
}

// =====================================================================
// Версии
// =====================================================================

export async function listProgramVersions(
    programId: string
): Promise<ProgramVersionSummary[]> {
    const apiVersions = await apiFetch<ApiProgramVersionSummary[]>(
        `/programs/${programId}/versions`
    );

    return apiVersions.map(mapApiVersionSummaryToSummary);
}

export async function getProgramVersion(
    programId: string,
    versionId: string
): Promise<ProgramVersion> {
    const apiVersion = await apiFetch<ApiProgramVersion>(
        `/programs/${programId}/versions/${versionId}`
    );

    return mapApiVersionToVersion(apiVersion);
}

export async function getProgramDraft(
    programId: string
): Promise<ProgramVersion> {
    const apiVersion = await apiFetch<ApiProgramVersion>(
        `/programs/${programId}/draft`
    );

    return mapApiVersionToVersion(apiVersion);
}

export async function updateProgramDraft(
    programId: string,
    structure: ProgramStructure
): Promise<ProgramVersion> {
    const apiVersion = await apiFetch<ApiProgramVersion>(
        `/programs/${programId}/draft`,
        {
            method: "PUT",
            body: mapStructureToApi(structure),
        }
    );

    return mapApiVersionToVersion(apiVersion);
}

export async function publishProgramDraft(
    programId: string,
    options: { changelog?: string; major?: boolean } = {}
): Promise<ProgramVersion> {
    const apiVersion = await apiFetch<ApiProgramVersion>(
        `/programs/${programId}/publish`,
        {
            method: "POST",
            body: {
                changelog: options.changelog || null,
                major: options.major ?? false,
            },
        }
    );

    return mapApiVersionToVersion(apiVersion);
}

// =====================================================================
// Избранное
// =====================================================================

export async function addProgramFavorite(programId: string): Promise<void> {
    await apiFetch(`/programs/${programId}/favorite`, { method: "POST" });
}

export async function removeProgramFavorite(
    programId: string
): Promise<void> {
    await apiFetch(`/programs/${programId}/favorite`, { method: "DELETE" });
}

export async function listFavoritePrograms(): Promise<Program[]> {
    const apiPrograms = await apiFetch<ApiProgram[]>("/programs/favorites/mine");

    return apiPrograms.map(mapApiProgramToProgram);
}

// =====================================================================
// Комментарии
// =====================================================================

export async function listProgramComments(
    programId: string
): Promise<ProgramComment[]> {
    const apiComments = await apiFetch<ApiProgramComment[]>(
        `/programs/${programId}/comments`
    );

    return apiComments.map(mapApiProgramCommentToComment);
}

export async function createProgramComment(
    programId: string,
    text: string
): Promise<ProgramComment> {
    const apiComment = await apiFetch<ApiProgramComment>(
        `/programs/${programId}/comments`,
        {
            method: "POST",
            body: { text },
        }
    );

    return mapApiProgramCommentToComment(apiComment);
}

export async function updateProgramComment(
    id: string,
    text: string
): Promise<ProgramComment> {
    const apiComment = await apiFetch<ApiProgramComment>(
        `/programs/comments/${id}`,
        {
            method: "PUT",
            body: { text },
        }
    );

    return mapApiProgramCommentToComment(apiComment);
}

export async function deleteProgramComment(id: string): Promise<void> {
    await apiFetch(`/programs/comments/${id}`, { method: "DELETE" });
}
