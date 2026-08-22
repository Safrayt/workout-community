import { apiFetch, buildQuery } from "./client";
import { dataUrlToFile, isDataUrl } from "./imageUpload";
import {
    mapApiCommentToComment,
    mapApiDiaryNoteToNote,
    mapApiPersonalTagToTag,
    mapApiWorkoutEntryToEntry,
    mapNewDiaryNoteToApi,
    mapNewWorkoutEntryToApi,
    type ApiComment,
    type ApiDiaryNote,
    type ApiPersonalTag,
    type ApiWorkoutEntry,
} from "./mappers/diary";

import type { WorkoutEntry } from "../types/workoutEntry";
import type { NewWorkoutEntry } from "../types/newWorkoutEntry";
import type { DiaryNote } from "../types/diaryNote";
import type { NewDiaryNote } from "../types/newDiaryNote";
import type { PersonalTag } from "../types/personalTag";
import type { Comment } from "../types/comment";
import type { DiaryRecordType } from "../types/diaryRecord";
import type { NewWorkoutEntryPhoto } from "../types/newWorkoutEntry";

// =====================================================================
// Записи тренировок
// =====================================================================

export async function listWorkoutEntries(): Promise<WorkoutEntry[]> {
    const apiEntries = await apiFetch<ApiWorkoutEntry[]>("/diary/entries");

    return apiEntries.map(mapApiWorkoutEntryToEntry);
}

async function getWorkoutEntry(id: string): Promise<WorkoutEntry> {
    const apiEntry = await apiFetch<ApiWorkoutEntry>(`/diary/entries/${id}`);

    return mapApiWorkoutEntryToEntry(apiEntry);
}

async function syncEntryPhotos(
    entryId: string,
    existingEntry: WorkoutEntry | undefined,
    formPhotos: NewWorkoutEntryPhoto[]
): Promise<void> {
    const formPhotoIds = new Set(
        formPhotos.filter((p) => !isDataUrl(p.url)).map((p) => p.id)
    );

    for (const existingPhoto of existingEntry?.photos ?? []) {
        if (!formPhotoIds.has(existingPhoto.id)) {
            await apiFetch(
                `/diary/entries/${entryId}/photos/${existingPhoto.id}`,
                { method: "DELETE" }
            );
        }
    }

    for (const photo of formPhotos) {
        if (!isDataUrl(photo.url)) {
            continue;
        }

        const file = dataUrlToFile(photo.url, `${photo.id}.jpg`);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("is_main", String(photo.isMain));

        await apiFetch(`/diary/entries/${entryId}/photos`, {
            method: "POST",
            body: formData,
        });
    }

    const mainFormPhoto = formPhotos.find((p) => p.isMain);

    if (mainFormPhoto && !isDataUrl(mainFormPhoto.url)) {
        const wasAlreadyMain = existingEntry?.photos?.find(
            (p) => p.id === mainFormPhoto.id
        )?.isMain;

        if (!wasAlreadyMain) {
            await apiFetch(
                `/diary/entries/${entryId}/photos/${mainFormPhoto.id}/set-main`,
                { method: "PUT" }
            );
        }
    }
}

export async function createWorkoutEntry(
    entry: NewWorkoutEntry
): Promise<WorkoutEntry> {
    const apiEntry = await apiFetch<ApiWorkoutEntry>("/diary/entries", {
        method: "POST",
        body: mapNewWorkoutEntryToApi(entry),
    });

    await syncEntryPhotos(String(apiEntry.id), undefined, entry.photos);

    return getWorkoutEntry(String(apiEntry.id));
}

export async function updateWorkoutEntry(
    id: string,
    entry: NewWorkoutEntry,
    existingEntry: WorkoutEntry
): Promise<WorkoutEntry> {
    await apiFetch<ApiWorkoutEntry>(`/diary/entries/${id}`, {
        method: "PUT",
        body: mapNewWorkoutEntryToApi(entry),
    });

    await syncEntryPhotos(id, existingEntry, entry.photos);

    return getWorkoutEntry(id);
}

export async function deleteWorkoutEntry(id: string): Promise<void> {
    await apiFetch(`/diary/entries/${id}`, { method: "DELETE" });
}

// =====================================================================
// Заметки дневника
// =====================================================================

export async function listDiaryNotes(): Promise<DiaryNote[]> {
    const apiNotes = await apiFetch<ApiDiaryNote[]>("/diary/notes");

    return apiNotes.map(mapApiDiaryNoteToNote);
}

async function getDiaryNote(id: string): Promise<DiaryNote> {
    const apiNote = await apiFetch<ApiDiaryNote>(`/diary/notes/${id}`);

    return mapApiDiaryNoteToNote(apiNote);
}

async function syncNotePhotos(
    noteId: string,
    existingNote: DiaryNote | undefined,
    formPhotos: NewWorkoutEntryPhoto[]
): Promise<void> {
    const formPhotoIds = new Set(
        formPhotos.filter((p) => !isDataUrl(p.url)).map((p) => p.id)
    );

    for (const existingPhoto of existingNote?.photos ?? []) {
        if (!formPhotoIds.has(existingPhoto.id)) {
            await apiFetch(
                `/diary/notes/${noteId}/photos/${existingPhoto.id}`,
                { method: "DELETE" }
            );
        }
    }

    for (const photo of formPhotos) {
        if (!isDataUrl(photo.url)) {
            continue;
        }

        const file = dataUrlToFile(photo.url, `${photo.id}.jpg`);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("is_main", String(photo.isMain));

        await apiFetch(`/diary/notes/${noteId}/photos`, {
            method: "POST",
            body: formData,
        });
    }

    const mainFormPhoto = formPhotos.find((p) => p.isMain);

    if (mainFormPhoto && !isDataUrl(mainFormPhoto.url)) {
        const wasAlreadyMain = existingNote?.photos?.find(
            (p) => p.id === mainFormPhoto.id
        )?.isMain;

        if (!wasAlreadyMain) {
            await apiFetch(
                `/diary/notes/${noteId}/photos/${mainFormPhoto.id}/set-main`,
                { method: "PUT" }
            );
        }
    }
}

export async function createDiaryNote(
    note: NewDiaryNote
): Promise<DiaryNote> {
    const apiNote = await apiFetch<ApiDiaryNote>("/diary/notes", {
        method: "POST",
        body: mapNewDiaryNoteToApi(note),
    });

    await syncNotePhotos(String(apiNote.id), undefined, note.photos);

    return getDiaryNote(String(apiNote.id));
}

export async function updateDiaryNote(
    id: string,
    note: NewDiaryNote,
    existingNote: DiaryNote
): Promise<DiaryNote> {
    await apiFetch<ApiDiaryNote>(`/diary/notes/${id}`, {
        method: "PUT",
        body: mapNewDiaryNoteToApi(note),
    });

    await syncNotePhotos(id, existingNote, note.photos);

    return getDiaryNote(id);
}

export async function deleteDiaryNote(id: string): Promise<void> {
    await apiFetch(`/diary/notes/${id}`, { method: "DELETE" });
}

// =====================================================================
// Личные теги
// =====================================================================

export async function listPersonalTags(): Promise<PersonalTag[]> {
    const apiTags = await apiFetch<ApiPersonalTag[]>("/diary/tags");

    return apiTags.map(mapApiPersonalTagToTag);
}

export async function createPersonalTag(
    name: string
): Promise<PersonalTag> {
    const apiTag = await apiFetch<ApiPersonalTag>("/diary/tags", {
        method: "POST",
        body: { name },
    });

    return mapApiPersonalTagToTag(apiTag);
}

export async function renamePersonalTag(
    id: string,
    name: string
): Promise<PersonalTag> {
    const apiTag = await apiFetch<ApiPersonalTag>(`/diary/tags/${id}`, {
        method: "PUT",
        body: { name },
    });

    return mapApiPersonalTagToTag(apiTag);
}

export async function deletePersonalTag(id: string): Promise<void> {
    await apiFetch(`/diary/tags/${id}`, { method: "DELETE" });
}

// =====================================================================
// Комментарии
// =====================================================================

export async function listAllComments(): Promise<Comment[]> {
    const apiComments = await apiFetch<ApiComment[]>("/diary/comments/all");

    return apiComments.map(mapApiCommentToComment);
}

export async function addComment(
    recordId: string,
    recordType: DiaryRecordType,
    text: string
): Promise<Comment> {
    const query = buildQuery({
        record_id: recordId,
        record_type: recordType,
    });

    const apiComment = await apiFetch<ApiComment>(
        `/diary/comments${query}`,
        {
            method: "POST",
            body: { text },
        }
    );

    return mapApiCommentToComment(apiComment);
}

export async function updateComment(
    id: string,
    text: string
): Promise<Comment> {
    const apiComment = await apiFetch<ApiComment>(`/diary/comments/${id}`, {
        method: "PUT",
        body: { text },
    });

    return mapApiCommentToComment(apiComment);
}

export async function deleteComment(id: string): Promise<void> {
    await apiFetch(`/diary/comments/${id}`, { method: "DELETE" });
}
