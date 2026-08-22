import type {
    TimeOfDay,
    WorkoutEntry,
    WorkoutEntryPhoto,
} from "../../types/workoutEntry";
import type { NewWorkoutEntry } from "../../types/newWorkoutEntry";
import type { DiaryNote } from "../../types/diaryNote";
import type { NewDiaryNote } from "../../types/newDiaryNote";
import type { PersonalTag } from "../../types/personalTag";
import type { Comment } from "../../types/comment";
import type { DiaryRecordType } from "../../types/diaryRecord";

import { resolveMediaUrl } from "../media";

export type ApiPhoto = {
    id: number;
    url: string;
    is_main: boolean;
};

function mapApiPhoto(photo: ApiPhoto): WorkoutEntryPhoto {
    return {
        id: String(photo.id),
        url: resolveMediaUrl(photo.url)!,
        isMain: photo.is_main,
    };
}

export type ApiWorkoutEntry = {
    id: number;
    user_id: number;
    playground_id: number | null;
    date: string;
    time_of_day: TimeOfDay | null;
    title: string;
    description: string;
    tags: string[];
    created_at: string;
    photos: ApiPhoto[];
};

export function mapApiWorkoutEntryToEntry(
    apiEntry: ApiWorkoutEntry
): WorkoutEntry {
    return {
        id: String(apiEntry.id),
        userId: String(apiEntry.user_id),
        playgroundId:
            apiEntry.playground_id !== null
                ? String(apiEntry.playground_id)
                : undefined,
        date: apiEntry.date,
        timeOfDay: apiEntry.time_of_day ?? undefined,
        tags: apiEntry.tags.length > 0 ? apiEntry.tags : undefined,
        title: apiEntry.title,
        description: apiEntry.description || undefined,
        photos: apiEntry.photos.length > 0
            ? apiEntry.photos.map(mapApiPhoto)
            : undefined,
        createdAt: apiEntry.created_at,
    };
}

export function mapNewWorkoutEntryToApi(
    entry: NewWorkoutEntry
): Record<string, unknown> {
    return {
        date: entry.date,
        time_of_day: entry.timeOfDay || null,
        playground_id: entry.playgroundId
            ? Number(entry.playgroundId)
            : null,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
    };
}

export type ApiDiaryNote = {
    id: number;
    user_id: number;
    playground_id: number | null;
    date: string;
    title: string | null;
    text: string;
    tags: string[];
    created_at: string;
    photos: ApiPhoto[];
};

export function mapApiDiaryNoteToNote(apiNote: ApiDiaryNote): DiaryNote {
    return {
        id: String(apiNote.id),
        userId: String(apiNote.user_id),
        date: apiNote.date,
        title: apiNote.title ?? undefined,
        text: apiNote.text,
        photos:
            apiNote.photos.length > 0
                ? apiNote.photos.map(mapApiPhoto)
                : undefined,
        playgroundId:
            apiNote.playground_id !== null
                ? String(apiNote.playground_id)
                : undefined,
        tags: apiNote.tags.length > 0 ? apiNote.tags : undefined,
        createdAt: apiNote.created_at,
    };
}

export function mapNewDiaryNoteToApi(
    note: NewDiaryNote
): Record<string, unknown> {
    return {
        title: note.title.trim() || null,
        text: note.text,
        playground_id: note.playgroundId ? Number(note.playgroundId) : null,
        tags: note.tags,
    };
}

export type ApiPersonalTag = {
    id: number;
    user_id: number;
    name: string;
    created_at: string;
};

export function mapApiPersonalTagToTag(
    apiTag: ApiPersonalTag
): PersonalTag {
    return {
        id: String(apiTag.id),
        userId: String(apiTag.user_id),
        name: apiTag.name,
        createdAt: apiTag.created_at,
    };
}

export type ApiComment = {
    id: number;
    record_id: number;
    record_type: DiaryRecordType;
    user_id: number;
    text: string;
    created_at: string;
};

export function mapApiCommentToComment(apiComment: ApiComment): Comment {
    return {
        id: String(apiComment.id),
        recordId: String(apiComment.record_id),
        recordType: apiComment.record_type,
        userId: String(apiComment.user_id),
        text: apiComment.text,
        createdAt: apiComment.created_at,
    };
}
