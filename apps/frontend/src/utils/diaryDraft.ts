import type { NewDiaryNote } from "../types/newDiaryNote";
import type {
    NewWorkoutEntry,
    WorkoutEntryPrefill,
} from "../types/newWorkoutEntry";

import { MAX_WORKOUT_ENTRY_PHOTOS } from "../constants/workoutEntryPhotos";
import { getTodayDateString } from "./today";

/**
 * Пустые формы и правила черновиков для записей дневника — тренировки
 * и заметки. Само хранение и автосохранение — hooks/useFormDraft.ts.
 */

/** Ключи черновиков: у каждого пользователя и вида записи свой. */
export function getWorkoutDraftKey(userId: string) {
    return `diary-workout:${userId}`;
}

export function getNoteDraftKey(userId: string) {
    return `diary-note:${userId}`;
}

export function createEmptyWorkoutEntry(): NewWorkoutEntry {
    return {
        // По умолчанию подставляем сегодняшнюю дату — так пользователю
        // почти никогда не придётся трогать это поле (UX-DIARY-CREATE §7).
        date: getTodayDateString(),
        timeOfDay: "",
        playgroundId: "",
        programId: "",
        programSection: "",
        programScheme: "",
        programSectionId: "",
        programSchemeId: "",
        title: "",
        description: "",
        photos: [],
        tags: [],
        hideFromFeed: false,
        isPrivate: false,
    };
}

const PREFILL_FIELDS = [
    "title",
    "description",
    "programId",
    "programSection",
    "programScheme",
    "programSectionId",
    "programSchemeId",
] as const;

/**
 * Заготовка записи из состояния адреса (location.state): состояние
 * может оказаться чем угодно, поэтому берём только известные строковые
 * поля. null — подставлять нечего.
 */
export function parseWorkoutPrefill(state: unknown): WorkoutEntryPrefill | null {
    if (!state || typeof state !== "object") {
        return null;
    }

    const raw = (state as { workoutPrefill?: unknown }).workoutPrefill;

    if (!raw || typeof raw !== "object") {
        return null;
    }

    const prefill: WorkoutEntryPrefill = {};

    for (const field of PREFILL_FIELDS) {
        const value = (raw as Record<string, unknown>)[field];

        if (typeof value === "string") {
            prefill[field] = value;
        }
    }

    return Object.keys(prefill).length > 0 ? prefill : null;
}

export function createEmptyDiaryNote(): NewDiaryNote {
    return {
        title: "",
        text: "",
        photos: [],
        playgroundId: "",
        tags: [],
        hideFromFeed: false,
        isPrivate: false,
    };
}

/**
 * Пустая форма — это и есть «нет черновика»: ничего не введено и не
 * выбрано. Дату (она по умолчанию сегодняшняя) и переключатели
 * видимости сами по себе содержимым не считаем.
 */
export function isWorkoutDraftEmpty(entry: NewWorkoutEntry) {
    return (
        entry.title.trim() === "" &&
        entry.description.trim() === "" &&
        entry.timeOfDay === "" &&
        entry.playgroundId === "" &&
        entry.programId === "" &&
        entry.programSection.trim() === "" &&
        entry.programScheme.trim() === "" &&
        !entry.programSectionId &&
        !entry.programSchemeId &&
        entry.photos.length === 0 &&
        entry.tags.length === 0
    );
}

export function isNoteDraftEmpty(note: NewDiaryNote) {
    return (
        note.title.trim() === "" &&
        note.text.trim() === "" &&
        note.playgroundId === "" &&
        note.photos.length === 0 &&
        note.tags.length === 0
    );
}

/**
 * Черновик мог быть сохранён более старой версией формы (например, до
 * появления нового поля) — накладываем его на актуальную пустую форму,
 * чтобы не получить undefined в новых полях. Дату оставляем ту, что
 * выбрал пользователь: тренировку обычно записывают задним числом, и
 * вчерашний черновик, скорее всего, как раз про вчерашнюю тренировку.
 */
export function normalizeWorkoutDraft(
    raw: Partial<NewWorkoutEntry>
): NewWorkoutEntry {
    const base = createEmptyWorkoutEntry();

    return {
        ...base,
        ...raw,
        date: typeof raw.date === "string" && raw.date !== "" ? raw.date : base.date,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        photos: Array.isArray(raw.photos)
            ? raw.photos.slice(0, MAX_WORKOUT_ENTRY_PHOTOS)
            : [],
    };
}

export function normalizeNoteDraft(raw: Partial<NewDiaryNote>): NewDiaryNote {
    const base = createEmptyDiaryNote();

    return {
        ...base,
        ...raw,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        photos: Array.isArray(raw.photos)
            ? raw.photos.slice(0, MAX_WORKOUT_ENTRY_PHOTOS)
            : [],
    };
}
