import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { WorkoutEntry } from "../types/workoutEntry";
import type { NewWorkoutEntry } from "../types/newWorkoutEntry";

import {
    createWorkoutEntry,
    deleteWorkoutEntry as apiDeleteEntry,
    listWorkoutEntries,
    updateWorkoutEntry,
} from "../api/diary";

type WorkoutDiaryContextType = {
    entries: WorkoutEntry[];

    /** true, пока идёт самая первая загрузка списка с сервера. */
    isLoading: boolean;

    addEntry: (entry: NewWorkoutEntry) => Promise<WorkoutEntry>;

    updateEntry: (
        id: string,
        entry: NewWorkoutEntry
    ) => Promise<WorkoutEntry | undefined>;

    deleteEntry: (id: string) => Promise<void>;

    /**
     * Перечитывает записи с сервера — используется PersonalTagsContext
     * после переименования/удаления тега, поскольку такое изменение
     * каскадно правит tags у записей на бэкенде (см.
     * _rename_tag_everywhere в routers/diary.py), а локальный кеш
     * здесь об этом не узнáет сам по себе.
     */
    refreshEntries: () => Promise<void>;
};


const WorkoutDiaryContext =
    createContext<WorkoutDiaryContextType | undefined>(undefined);


export function WorkoutDiaryProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [entries, setEntries] = useState<WorkoutEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function refreshEntries(): Promise<void> {
        const fetched = await listWorkoutEntries();
        setEntries(fetched);
    }

    useEffect(() => {
        listWorkoutEntries()
            .then(setEntries)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить записи дневника:",
                    error
                );
            })
            .finally(() => setIsLoading(false));
    }, []);


    async function addEntry(
        entry: NewWorkoutEntry
    ): Promise<WorkoutEntry> {
        const created = await createWorkoutEntry(entry);

        setEntries((current) => [...current, created]);

        return created;
    }


    async function updateEntry(
        id: string,
        entry: NewWorkoutEntry
    ): Promise<WorkoutEntry | undefined> {
        const existing = entries.find((item) => item.id === id);

        if (!existing) {
            return undefined;
        }

        const updated = await updateWorkoutEntry(id, entry, existing);

        setEntries((current) =>
            current.map((item) => (item.id === id ? updated : item))
        );

        return updated;
    }


    async function deleteEntry(id: string): Promise<void> {
        await apiDeleteEntry(id);

        setEntries((current) => current.filter((item) => item.id !== id));
    }


    return (
        <WorkoutDiaryContext.Provider
            value={{
                entries,
                isLoading,
                addEntry,
                updateEntry,
                deleteEntry,
                refreshEntries,
            }}
        >
            {children}
        </WorkoutDiaryContext.Provider>
    );
}


export function useWorkoutDiary() {
    const context = useContext(WorkoutDiaryContext);

    if (!context) {
        throw new Error(
            "useWorkoutDiary must be used inside WorkoutDiaryProvider"
        );
    }

    return context;
}
