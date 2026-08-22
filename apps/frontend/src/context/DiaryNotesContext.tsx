import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { DiaryNote } from "../types/diaryNote";
import type { NewDiaryNote } from "../types/newDiaryNote";

import {
    createDiaryNote,
    deleteDiaryNote as apiDeleteNote,
    listDiaryNotes,
    updateDiaryNote,
} from "../api/diary";

type DiaryNotesContextType = {
    notes: DiaryNote[];

    isLoading: boolean;

    addNote: (note: NewDiaryNote) => Promise<DiaryNote>;

    updateNote: (
        id: string,
        note: NewDiaryNote
    ) => Promise<DiaryNote | undefined>;

    deleteNote: (id: string) => Promise<void>;

    /** См. комментарий у refreshEntries в WorkoutDiaryContext — тот
     * же смысл, для заметок. */
    refreshNotes: () => Promise<void>;
};

const DiaryNotesContext =
    createContext<DiaryNotesContextType | undefined>(undefined);


export function DiaryNotesProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [notes, setNotes] = useState<DiaryNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function refreshNotes(): Promise<void> {
        const fetched = await listDiaryNotes();
        setNotes(fetched);
    }

    useEffect(() => {
        listDiaryNotes()
            .then(setNotes)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить заметки дневника:",
                    error
                );
            })
            .finally(() => setIsLoading(false));
    }, []);


    async function addNote(note: NewDiaryNote): Promise<DiaryNote> {
        const created = await createDiaryNote(note);

        setNotes((current) => [...current, created]);

        return created;
    }


    async function updateNote(
        id: string,
        note: NewDiaryNote
    ): Promise<DiaryNote | undefined> {
        const existing = notes.find((item) => item.id === id);

        if (!existing) {
            return undefined;
        }

        const updated = await updateDiaryNote(id, note, existing);

        setNotes((current) =>
            current.map((item) => (item.id === id ? updated : item))
        );

        return updated;
    }


    async function deleteNote(id: string): Promise<void> {
        await apiDeleteNote(id);

        setNotes((current) => current.filter((item) => item.id !== id));
    }


    return (
        <DiaryNotesContext.Provider
            value={{
                notes,
                isLoading,
                addNote,
                updateNote,
                deleteNote,
                refreshNotes,
            }}
        >
            {children}
        </DiaryNotesContext.Provider>
    );
}


export function useDiaryNotes() {
    const context = useContext(DiaryNotesContext);

    if (!context) {
        throw new Error(
            "useDiaryNotes must be used inside DiaryNotesProvider"
        );
    }

    return context;
}
