import {
    createContext,
    useContext,
    useState,
} from "react";

import type {
    WorkoutEntry,
    TimeOfDay,
} from "../types/workoutEntry";

import type {
    NewWorkoutEntry,
} from "../types/newWorkoutEntry";

import {
    workoutEntries as initialWorkoutEntries,
} from "../data/workoutEntries";

import {
    useCurrentUser,
} from "./CurrentUserContext";

import {
    MAX_TAGS_PER_ENTRY,
} from "../utils/workoutTags";

type WorkoutDiaryContextType = {
    entries: WorkoutEntry[];

    addEntry: (
        entry: NewWorkoutEntry
    ) => WorkoutEntry;

    updateEntry: (
        id: string,
        entry: NewWorkoutEntry
    ) => WorkoutEntry | undefined;

    deleteEntry: (
        id: string
    ) => void;

    /**
     * Переименование тега применяется ко всем записям пользователя,
     * где он использовался — новый тег не создаётся, старый не
     * остаётся (UX-PERSONAL-TAGS §20–21, §41).
     */
    renameTagInEntries: (
        userId: string,
        oldName: string,
        newName: string
    ) => void;

    /**
     * Удаление тега — это удаление связи с записями, а не удаление
     * самих записей (UX-PERSONAL-TAGS §22–26, §40).
     */
    removeTagFromEntries: (
        userId: string,
        tagName: string
    ) => void;
};

const WorkoutDiaryContext =
    createContext<WorkoutDiaryContextType | undefined>(undefined);

function buildEntryFields(
    entry: NewWorkoutEntry
) {
    return {
        playgroundId:
            entry.playgroundId || undefined,

        date: entry.date,

        timeOfDay:
            (entry.timeOfDay || undefined) as
                TimeOfDay | undefined,

        title: entry.title,

        tags:
            entry.tags.length > 0
                ? entry.tags.slice(0, MAX_TAGS_PER_ENTRY)
                : undefined,

        description:
            entry.description || undefined,

        photos:
            entry.photos.length > 0
                ? entry.photos
                : undefined,
    };
}


export function WorkoutDiaryProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [
        entries,
        setEntries,
    ] = useState(
        initialWorkoutEntries
    );

    const {
        currentUser,
    } = useCurrentUser();

    function addEntry(
        entry: NewWorkoutEntry
    ) {
        const newEntry: WorkoutEntry = {
            id: crypto.randomUUID(),

            userId: currentUser.id,

            ...buildEntryFields(entry),

            createdAt: new Date().toISOString(),
        };

        setEntries(
            (current) => [
                ...current,
                newEntry,
            ]
        );

        return newEntry;
    }

    function updateEntry(
        id: string,
        entry: NewWorkoutEntry
    ) {
        const existingEntry = entries.find(
            (item) => item.id === id
        );

        if (!existingEntry) {
            return undefined;
        }

        const updatedEntry: WorkoutEntry = {
            ...existingEntry,

            ...buildEntryFields(entry),
        };

        setEntries(
            (current) =>
                current.map(
                    (item) =>
                        item.id === id
                            ? updatedEntry
                            : item
                )
        );

        return updatedEntry;
    }

    function deleteEntry(
        id: string
    ) {
        setEntries(
            (current) =>
                current.filter(
                    (item) => item.id !== id
                )
        );
    }

    function renameTagInEntries(
        userId: string,
        oldName: string,
        newName: string
    ) {
        setEntries(
            (current) =>
                current.map((entry) => {
                    if (
                        entry.userId !== userId ||
                        !(entry.tags ?? []).includes(oldName)
                    ) {
                        return entry;
                    }

                    // На случай, если новое имя уже есть среди
                    // тегов записи — не дублируем его.
                    const updatedTags = Array.from(
                        new Set(
                            (entry.tags ?? []).map(
                                (tag) => tag === oldName ? newName : tag
                            )
                        )
                    );

                    return {
                        ...entry,
                        tags: updatedTags,
                    };
                })
        );
    }

    function removeTagFromEntries(
        userId: string,
        tagName: string
    ) {
        setEntries(
            (current) =>
                current.map((entry) => {
                    if (
                        entry.userId !== userId ||
                        !(entry.tags ?? []).includes(tagName)
                    ) {
                        return entry;
                    }

                    const updatedTags = (entry.tags ?? []).filter(
                        (tag) => tag !== tagName
                    );

                    return {
                        ...entry,
                        tags:
                            updatedTags.length > 0
                                ? updatedTags
                                : undefined,
                    };
                })
        );
    }

    return (
        <WorkoutDiaryContext.Provider
            value={{
                entries,
                addEntry,
                updateEntry,
                deleteEntry,
                renameTagInEntries,
                removeTagFromEntries,
            }}
        >
            {children}
        </WorkoutDiaryContext.Provider>
    );
}

export function useWorkoutDiary() {
    const context =
        useContext(
            WorkoutDiaryContext
        );

    if (!context) {
        throw new Error(
            "useWorkoutDiary must be used inside WorkoutDiaryProvider"
        );
    }

    return context;
}