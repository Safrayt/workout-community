import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { Playground } from "../types/playground";
import type { NewPlayground } from "../types/newPlayground";

import {
    confirmPlaygroundInspection as apiConfirmInspection,
    createPlayground as apiCreatePlayground,
    deletePlayground as apiDeletePlayground,
    listPlaygrounds,
    updatePlayground as apiUpdatePlayground,
} from "../api/playgrounds";

type PlaygroundContextType = {
    playgrounds: Playground[];

    /** true, пока идёт самая первая загрузка списка с сервера. */
    isLoading: boolean;

    addPlayground: (
        playground: NewPlayground
    ) => Promise<Playground>;

    updatePlayground: (
        id: string,
        playground: NewPlayground
    ) => Promise<Playground>;

    deletePlayground: (
        id: string
    ) => Promise<void>;

    confirmPlaygroundInspection: (
        id: string
    ) => Promise<void>;
};


const PlaygroundContext =
createContext<
    PlaygroundContextType | undefined
>(undefined);


export function PlaygroundProvider({
    children,
}: {
    children: React.ReactNode;
}) {

    const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        listPlaygrounds()
            .then(setPlaygrounds)
            .catch((error: unknown) => {
                console.error("Не удалось загрузить площадки:", error);
            })
            .finally(() => setIsLoading(false));
    }, []);


    async function addPlayground(
        playground: NewPlayground
    ): Promise<Playground> {
        const created = await apiCreatePlayground(playground);

        setPlaygrounds((current) => [...current, created]);

        return created;
    }


    async function updatePlayground(
        id: string,
        playground: NewPlayground
    ): Promise<Playground> {
        const existing = playgrounds.find((p) => p.id === id);

        if (!existing) {
            throw new Error(`Площадка ${id} не найдена в текущем списке`);
        }

        const updated = await apiUpdatePlayground(id, playground, existing);

        setPlaygrounds((current) =>
            current.map((p) => (p.id === id ? updated : p))
        );

        return updated;
    }


    async function confirmPlaygroundInspection(
        id: string
    ): Promise<void> {
        const updated = await apiConfirmInspection(id);

        setPlaygrounds((current) =>
            current.map((p) => (p.id === id ? updated : p))
        );
    }


    async function deletePlayground(
        id: string
    ): Promise<void> {
        await apiDeletePlayground(id);

        setPlaygrounds((current) =>
            current.filter((playground) => playground.id !== id)
        );
    }


    return (
        <PlaygroundContext.Provider
            value={{
                playgrounds,
                isLoading,
                addPlayground,
                updatePlayground,
                deletePlayground,
                confirmPlaygroundInspection,
            }}
        >
            {children}
        </PlaygroundContext.Provider>
    );
}


export function usePlaygrounds() {

    const context =
        useContext(
            PlaygroundContext
        );

    if (!context) {
        throw new Error(
            "usePlaygrounds must be used inside PlaygroundProvider"
        );
    }

    return context;
}
