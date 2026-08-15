import {
    createContext,
    useContext,
    useState,
} from "react";

import type {
    DiaryNote,
} from "../types/diaryNote";

import type {
    NewDiaryNote,
} from "../types/newDiaryNote";

import {
    diaryNotes as initialDiaryNotes,
} from "../data/diaryNotes";

import {
    useCurrentUser,
} from "./CurrentUserContext";

type DiaryNotesContextType = {
    notes: DiaryNote[];

    addNote: (
        note: NewDiaryNote
    ) => DiaryNote;

    updateNote: (
        id: string,
        note: NewDiaryNote
    ) => DiaryNote | undefined;

    deleteNote: (
        id: string
    ) => void;

    renameTagInNotes: (
        userId: string,
        oldName: string,
        newName: string
    ) => void;

    removeTagFromNotes: (
        userId: string,
        tagName: string
    ) => void;
};

const DiaryNotesContext =
    createContext<DiaryNotesContextType | undefined>(undefined);

function buildNoteFields(
    note: NewDiaryNote
) {
    return {
        title:
            note.title.trim() || undefined,

        text: note.text,

        playgroundId:
            note.playgroundId || undefined,

        tags:
            note.tags.length > 0
                ? note.tags
                : undefined,

        photos:
            note.photos.length > 0
                ? note.photos
                : undefined,
    };
}

export function DiaryNotesProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [
        notes,
        setNotes,
    ] = useState(
        initialDiaryNotes
    );

    const {
        currentUser,
    } = useCurrentUser();

    function addNote(
        note: NewDiaryNote
    ) {
        const newNote: DiaryNote = {
            id: crypto.randomUUID(),

            userId: currentUser.id,

            date: new Date().toISOString().slice(0, 10),

            ...buildNoteFields(note),

            createdAt: new Date().toISOString(),
        };

        setNotes(
            (current) => [
                ...current,
                newNote,
            ]
        );

        return newNote;
    }

    function updateNote(
        id: string,
        note: NewDiaryNote
    ) {
        const existingNote = notes.find(
            (item) => item.id === id
        );

        if (!existingNote) {
            return undefined;
        }

        const updatedNote: DiaryNote = {
            ...existingNote,

            ...buildNoteFields(note),
        };

        setNotes(
            (current) =>
                current.map(
                    (item) =>
                        item.id === id
                            ? updatedNote
                            : item
                )
        );

        return updatedNote;
    }

    function deleteNote(
        id: string
    ) {
        setNotes(
            (current) =>
                current.filter(
                    (item) => item.id !== id
                )
        );
    }

    function renameTagInNotes(
        userId: string,
        oldName: string,
        newName: string
    ) {
        setNotes(
            (current) =>
                current.map((note) => {
                    if (
                        note.userId !== userId ||
                        !(note.tags ?? []).includes(oldName)
                    ) {
                        return note;
                    }

                    const updatedTags = Array.from(
                        new Set(
                            (note.tags ?? []).map(
                                (tag) => tag === oldName ? newName : tag
                            )
                        )
                    );

                    return {
                        ...note,
                        tags: updatedTags,
                    };
                })
        );
    }

    function removeTagFromNotes(
        userId: string,
        tagName: string
    ) {
        setNotes(
            (current) =>
                current.map((note) => {
                    if (
                        note.userId !== userId ||
                        !(note.tags ?? []).includes(tagName)
                    ) {
                        return note;
                    }

                    const updatedTags = (note.tags ?? []).filter(
                        (tag) => tag !== tagName
                    );

                    return {
                        ...note,
                        tags:
                            updatedTags.length > 0
                                ? updatedTags
                                : undefined,
                    };
                })
        );
    }

    return (
        <DiaryNotesContext.Provider
            value={{
                notes,
                addNote,
                updateNote,
                deleteNote,
                renameTagInNotes,
                removeTagFromNotes,
            }}
        >
            {children}
        </DiaryNotesContext.Provider>
    );
}

export function useDiaryNotes() {
    const context =
        useContext(
            DiaryNotesContext
        );

    if (!context) {
        throw new Error(
            "useDiaryNotes must be used inside DiaryNotesProvider"
        );
    }

    return context;
}
