import type { NewDiaryNote } from "../types/newDiaryNote";
import type { NewWorkoutEntry } from "../types/newWorkoutEntry";

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
        title: "",
        description: "",
        photos: [],
        tags: [],
        hideFromFeed: false,
        isPrivate: false,
    };
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
