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
    getWorkoutEntry,
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
     * Перечитывает с сервера ОДНУ конкретную запись и подменяет её в
     * локальном списке `entries`.
     *
     * `entries` целиком загружается один раз при старте SPA-сессии
     * (см. useEffect ниже) и дальше не перезапрашивается сам по себе
     * — значит, если запись поменял (или отредактировал форматирование
     * описания) кто-то другой, в вашей уже открытой вкладке останется
     * старая версия, пока вы не перезагрузите страницу целиком. Чтобы
     * страница конкретной записи (WorkoutEntryDetails) всегда
     * показывала актуальный текст, а не то, что было в списке на
     * момент запуска сессии, она вызывает эту функцию при открытии.
     */
    refreshEntry: (id: string) => Promise<void>;

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


    async function refreshEntry(id: string): Promise<void> {
        const fresh = await getWorkoutEntry(id);

        setEntries((current) => {
            const exists = current.some((item) => item.id === id);

            if (!exists) {
                // Запись могла не попасть в изначальный список (её
                // тогда ещё не было, или видимость поменялась) —
                // добавляем, а не молча игнорируем.
                return [...current, fresh];
            }

            return current.map((item) => (item.id === id ? fresh : item));
        });
    }


    return (
        <WorkoutDiaryContext.Provider
            value={{
                entries,
                isLoading,
                addEntry,
                updateEntry,
                deleteEntry,
                refreshEntry,
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
