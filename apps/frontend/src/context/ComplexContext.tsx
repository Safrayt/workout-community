import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { Complex } from "../types/complex";
import type { ComplexCompletion } from "../types/complexCompletion";
import type { NewComplex } from "../types/newComplex";
import type { NewComplexCompletion } from "../types/newComplexCompletion";

import {
    createCompletion as apiCreateCompletion,
    createComplex as apiCreateComplex,
    deleteCompletion as apiDeleteCompletion,
    listCompletions as apiListCompletions,
    listComplexes,
    updateCompletion as apiUpdateCompletion,
    updateComplex as apiUpdateComplex,
} from "../api/complexes";

type ComplexContextType = {
    complexes: Complex[];

    /** true, пока идёт самая первая загрузка каталога с сервера. */
    isLoading: boolean;

    getComplexById: (id: string) => Complex | undefined;

    /** Только для администратора — см. ensure_admin на бэкенде. */
    addComplex: (data: NewComplex) => Promise<Complex>;

    /** Только для администратора — см. ensure_admin на бэкенде. */
    editComplex: (id: string, data: NewComplex) => Promise<Complex>;

    /** Кэш истории выполнений текущего пользователя по complexId. */
    completionsByComplex: Record<string, ComplexCompletion[]>;

    /** Загружает (или перечитывает) историю выполнений одного комплекса. */
    loadCompletions: (complexId: string) => Promise<ComplexCompletion[]>;

    addCompletion: (
        complexId: string,
        data: NewComplexCompletion
    ) => Promise<ComplexCompletion>;

    editCompletion: (
        id: string,
        complexId: string,
        data: Partial<NewComplexCompletion>,
        clearDiaryEntry?: boolean
    ) => Promise<ComplexCompletion>;

    removeCompletion: (id: string, complexId: string) => Promise<void>;
};

const ComplexContext = createContext<ComplexContextType | undefined>(
    undefined
);

export function ComplexProvider({ children }: { children: React.ReactNode }) {
    const [complexes, setComplexes] = useState<Complex[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [completionsByComplex, setCompletionsByComplex] = useState<
        Record<string, ComplexCompletion[]>
    >({});

    useEffect(() => {
        listComplexes()
            .then(setComplexes)
            .catch((error: unknown) => {
                console.error("Не удалось загрузить каталог комплексов:", error);
            })
            .finally(() => setIsLoading(false));
    }, []);

    function getComplexById(id: string): Complex | undefined {
        return complexes.find((complexDef) => complexDef.id === id);
    }

    async function addComplex(data: NewComplex): Promise<Complex> {
        const created = await apiCreateComplex(data);

        setComplexes((current) => [...current, created]);

        return created;
    }

    async function editComplex(
        id: string,
        data: NewComplex
    ): Promise<Complex> {
        const updated = await apiUpdateComplex(id, data);

        setComplexes((current) =>
            current.map((complexDef) =>
                complexDef.id === id ? updated : complexDef
            )
        );

        return updated;
    }

    async function loadCompletions(
        complexId: string
    ): Promise<ComplexCompletion[]> {
        const completions = await apiListCompletions(complexId);

        setCompletionsByComplex((current) => ({
            ...current,
            [complexId]: completions,
        }));

        return completions;
    }

    async function addCompletion(
        complexId: string,
        data: NewComplexCompletion
    ): Promise<ComplexCompletion> {
        const created = await apiCreateCompletion(complexId, data);

        setCompletionsByComplex((current) => ({
            ...current,
            [complexId]: [created, ...(current[complexId] ?? [])],
        }));

        return created;
    }

    async function editCompletion(
        id: string,
        complexId: string,
        data: Partial<NewComplexCompletion>,
        clearDiaryEntry: boolean = false
    ): Promise<ComplexCompletion> {
        const updated = await apiUpdateCompletion(id, data, clearDiaryEntry);

        setCompletionsByComplex((current) => ({
            ...current,
            [complexId]: (current[complexId] ?? []).map((completion) =>
                completion.id === id ? updated : completion
            ),
        }));

        return updated;
    }

    async function removeCompletion(
        id: string,
        complexId: string
    ): Promise<void> {
        await apiDeleteCompletion(id);

        setCompletionsByComplex((current) => ({
            ...current,
            [complexId]: (current[complexId] ?? []).filter(
                (completion) => completion.id !== id
            ),
        }));
    }

    return (
        <ComplexContext.Provider
            value={{
                complexes,
                isLoading,
                getComplexById,
                addComplex,
                editComplex,
                completionsByComplex,
                loadCompletions,
                addCompletion,
                editCompletion,
                removeCompletion,
            }}
        >
            {children}
        </ComplexContext.Provider>
    );
}

export function useComplexes() {
    const context = useContext(ComplexContext);

    if (!context) {
        throw new Error("useComplexes must be used inside ComplexProvider");
    }

    return context;
}
