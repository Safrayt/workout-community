import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import type { Exercise } from "../types/exercise";
import type { NewExercise } from "../types/newExercise";

import {
    createExercise as apiCreateExercise,
    deleteExercise as apiDeleteExercise,
    deleteExercisePhoto as apiDeleteExercisePhoto,
    deleteExerciseVideo as apiDeleteExerciseVideo,
    listExercises,
    updateExercise as apiUpdateExercise,
    uploadExercisePhoto as apiUploadExercisePhoto,
    uploadExerciseVideo as apiUploadExerciseVideo,
} from "../api/exercises";

type ExerciseContextType = {
    exercises: Exercise[];

    /** true, пока идёт загрузка списка с сервера. */
    isLoading: boolean;

    /** Сообщение, если список не удалось загрузить. */
    loadError: string | null;

    reload: () => Promise<void>;

    getExerciseById: (id: string) => Exercise | undefined;

    /** Все методы ниже — только для администратора (см. ensure_admin). */
    addExercise: (data: NewExercise) => Promise<Exercise>;
    editExercise: (id: string, data: NewExercise) => Promise<Exercise>;
    removeExercise: (id: string) => Promise<void>;
    uploadPhoto: (id: string, file: File) => Promise<Exercise>;
    removePhoto: (id: string) => Promise<Exercise>;
    uploadVideo: (id: string, file: File) => Promise<Exercise>;
    removeVideo: (id: string) => Promise<Exercise>;
};

const ExerciseContext = createContext<ExerciseContextType | undefined>(
    undefined
);

export function ExerciseProvider({ children }: { children: React.ReactNode }) {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Загрузка списка. setState вызывается только в колбэках промиса, а
    // не синхронно — поэтому её можно запускать из эффекта.
    const load = useCallback(
        () =>
            listExercises()
                .then(setExercises)
                .catch((error: unknown) => {
                    console.error("Не удалось загрузить упражнения:", error);

                    setLoadError("Не удалось загрузить упражнения.");
                })
                .finally(() => setIsLoading(false)),
        []
    );

    useEffect(() => {
        void load();
    }, [load]);

    async function reload(): Promise<void> {
        setIsLoading(true);
        setLoadError(null);

        await load();
    }

    function getExerciseById(id: string): Exercise | undefined {
        return exercises.find((exercise) => exercise.id === id);
    }

    /** Подставляет ответ сервера на место старой версии упражнения. */
    function replaceExercise(updated: Exercise): Exercise {
        setExercises((current) =>
            current.map((exercise) =>
                exercise.id === updated.id ? updated : exercise
            )
        );

        return updated;
    }

    async function addExercise(data: NewExercise): Promise<Exercise> {
        const created = await apiCreateExercise(data);

        // Новые упражнения сервер ставит в конец списка.
        setExercises((current) => [...current, created]);

        return created;
    }

    async function editExercise(
        id: string,
        data: NewExercise
    ): Promise<Exercise> {
        return replaceExercise(await apiUpdateExercise(id, data));
    }

    async function removeExercise(id: string): Promise<void> {
        await apiDeleteExercise(id);

        setExercises((current) =>
            current.filter((exercise) => exercise.id !== id)
        );
    }

    return (
        <ExerciseContext.Provider
            value={{
                exercises,
                isLoading,
                loadError,
                reload,
                getExerciseById,
                addExercise,
                editExercise,
                removeExercise,
                uploadPhoto: async (id, file) =>
                    replaceExercise(await apiUploadExercisePhoto(id, file)),
                removePhoto: async (id) =>
                    replaceExercise(await apiDeleteExercisePhoto(id)),
                uploadVideo: async (id, file) =>
                    replaceExercise(await apiUploadExerciseVideo(id, file)),
                removeVideo: async (id) =>
                    replaceExercise(await apiDeleteExerciseVideo(id)),
            }}
        >
            {children}
        </ExerciseContext.Provider>
    );
}

export function useExercises() {
    const context = useContext(ExerciseContext);

    if (!context) {
        throw new Error("useExercises must be used inside ExerciseProvider");
    }

    return context;
}
