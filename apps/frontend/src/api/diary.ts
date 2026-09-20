import { apiFetch, apiFetchBlob, buildQuery } from "./client";
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
import type { HomeActivityMarker } from "../types/homeActivityMarker";

// =====================================================================
// Записи тренировок
// =====================================================================

export async function listWorkoutEntries(
    options: { includeHidden?: boolean } = {}
): Promise<WorkoutEntry[]> {
    const apiEntries = await apiFetch<ApiWorkoutEntry[]>(
        `/diary/entries${buildQuery({ include_hidden: options.includeHidden })}`
    );

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

export async function listDiaryNotes(
    options: { includeHidden?: boolean } = {}
): Promise<DiaryNote[]> {
    const apiNotes = await apiFetch<ApiDiaryNote[]>(
        `/diary/notes${buildQuery({ include_hidden: options.includeHidden })}`
    );

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

// =====================================================================
// Карта активности (полностью анонимная агрегация)
// =====================================================================

type ApiActivityMapMarker = {
    playground_id: number;
    workout_count: number;
    note_count: number;
    last_activity_at: string;
};

/**
 * В отличие от listWorkoutEntries/listDiaryNotes выше, этот эндпоинт
 * специально игнорирует всю приватность (см. app/routers/diary.py:
 * get_activity_map) — карта показывает только "здесь недавно кто-то
 * тренировался", без привязки к конкретному пользователю, поэтому
 * даже приватные записи честно попадают в счётчик, не раскрывая
 * личность автора.
 */
export async function getActivityMap(
    hours: number
): Promise<HomeActivityMarker[]> {
    const apiMarkers = await apiFetch<ApiActivityMapMarker[]>(
        `/diary/activity-map${buildQuery({ hours })}`
    );

    return apiMarkers.map((marker) => ({
        playgroundId: String(marker.playground_id),
        hasWorkout: marker.workout_count > 0,
        hasNote: marker.note_count > 0,
        workoutCount: marker.workout_count,
        noteCount: marker.note_count,
        lastActivityAt: marker.last_activity_at,
    }));
}

/**
 * Кнопка «Скачать записи» на странице /diary — личный архив со всеми
 * записями (тренировки и заметки) и фотографиями, см.
 * GET /diary/export в routers/diary.py. Сам браузерный download
 * запускается через синтетическую ссылку — на этом файл и остаётся,
 * страница ничего никуда не открывает и не перезагружает.
 */
export async function downloadDiaryExport(): Promise<void> {
    const blob = await apiFetchBlob("/diary/export");

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diary-export.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
