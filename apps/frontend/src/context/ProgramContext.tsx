import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type { Program } from "../types/program";
import type { NewProgram } from "../types/newProgram";

import {
    addProgramFavorite as apiAddProgramFavorite,
    createProgram as apiCreateProgram,
    deleteProgram as apiDeleteProgram,
    listPrograms,
    removeProgramFavorite as apiRemoveProgramFavorite,
    updateProgram as apiUpdateProgram,
} from "../api/programs";

type ProgramContextType = {
    /** Публичный каталог — только опубликованные программы (см.
     *  GET /programs/ на бэкенде). Собственные черновики видны автору
     *  на странице самой программы, но не попадают сюда. */
    programs: Program[];

    /** true, пока идёт самая первая загрузка каталога. */
    isLoading: boolean;

    refreshPrograms: () => Promise<void>;

    getProgramById: (id: string) => Program | undefined;

    createProgram: (data: NewProgram) => Promise<Program>;

    updateProgram: (
        id: string,
        data: NewProgram,
        existingProgram?: Program
    ) => Promise<Program>;

    deleteProgram: (id: string) => Promise<void>;

    toggleFavorite: (program: Program) => Promise<void>;

    /**
     * Точечное обновление одной программы в каталоге — используется
     * после публикации версии на странице редактирования, чтобы
     * каталог сразу отразил is_published/currentVersionId без
     * повторного запроса всего списка.
     */
    upsertProgram: (program: Program) => void;

    removeProgramFromList: (id: string) => void;
};

const ProgramContext = createContext<ProgramContextType | undefined>(
    undefined
);

export function ProgramProvider({ children }: { children: ReactNode }) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function refreshPrograms() {
        const fetched = await listPrograms();
        setPrograms(fetched);
    }

    useEffect(() => {
        refreshPrograms()
            .catch((error: unknown) => {
                console.error("Не удалось загрузить каталог программ:", error);
            })
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function getProgramById(id: string): Program | undefined {
        return programs.find((program) => program.id === id);
    }

    function upsertProgram(program: Program) {
        setPrograms((current) => {
            const exists = current.some((item) => item.id === program.id);

            if (!exists) {
                // Программа только что впервые опубликована — раньше
                // её не было видно в публичном каталоге вовсе.
                return program.isPublished ? [program, ...current] : current;
            }

            if (!program.isPublished) {
                // Не должно происходить в обычном потоке (программу
                // нельзя "рас-опубликовать"), но на всякий случай не
                // оставляем в публичном каталоге то, чего там быть не
                // должно.
                return current.filter((item) => item.id !== program.id);
            }

            return current.map((item) =>
                item.id === program.id ? program : item
            );
        });
    }

    function removeProgramFromList(id: string) {
        setPrograms((current) => current.filter((item) => item.id !== id));
    }

    async function createProgram(data: NewProgram): Promise<Program> {
        // Новая программа — черновик, в публичный каталог не попадает
        // до первой публикации, поэтому список здесь не трогаем.
        return apiCreateProgram(data);
    }

    async function updateProgram(
        id: string,
        data: NewProgram,
        existingProgram?: Program
    ): Promise<Program> {
        const updated = await apiUpdateProgram(id, data, existingProgram);

        upsertProgram(updated);

        return updated;
    }

    async function deleteProgram(id: string): Promise<void> {
        await apiDeleteProgram(id);
        removeProgramFromList(id);
    }

    async function toggleFavorite(program: Program): Promise<void> {
        if (program.isFavoritedByViewer) {
            await apiRemoveProgramFavorite(program.id);
        } else {
            await apiAddProgramFavorite(program.id);
        }

        upsertProgram({
            ...program,
            isFavoritedByViewer: !program.isFavoritedByViewer,
            favoritesCount: program.isFavoritedByViewer
                ? program.favoritesCount - 1
                : program.favoritesCount + 1,
        });
    }

    return (
        <ProgramContext.Provider
            value={{
                programs,
                isLoading,
                refreshPrograms,
                getProgramById,
                createProgram,
                updateProgram,
                deleteProgram,
                toggleFavorite,
                upsertProgram,
                removeProgramFromList,
            }}
        >
            {children}
        </ProgramContext.Provider>
    );
}

export function usePrograms() {
    const context = useContext(ProgramContext);

    if (!context) {
        throw new Error("usePrograms must be used inside ProgramProvider");
    }

    return context;
}
