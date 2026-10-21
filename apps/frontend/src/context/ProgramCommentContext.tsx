import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type { ProgramComment } from "../types/programComment";

import {
    createProgramComment,
    deleteProgramComment as apiDeleteProgramComment,
    listProgramComments,
    updateProgramComment as apiUpdateProgramComment,
} from "../api/programs";

import { useAuth } from "./CurrentUserContext";

type ProgramCommentContextType = {
    /** Накопительный кеш комментариев по всем программам, которые уже
     *  загружались через refreshComments — как и в ComplexCommentContext,
     *  единого эндпоинта "все комментарии сайта" нет и не нужно. */
    comments: ProgramComment[];

    refreshComments: (programId: string) => Promise<void>;

    addComment: (programId: string, text: string) => Promise<ProgramComment>;

    updateComment: (
        id: string,
        text: string
    ) => Promise<ProgramComment | undefined>;

    deleteComment: (id: string) => Promise<void>;
};

const ProgramCommentContext = createContext<
    ProgramCommentContextType | undefined
>(undefined);

export function ProgramCommentProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [comments, setComments] = useState<ProgramComment[]>([]);

    // Комментарии читают и гости — пользователя может не быть (тогда
    // чужие и "свои" комментарии править/удалять нечем).
    const { user: currentUser } = useAuth();

    async function refreshComments(programId: string) {
        const fetched = await listProgramComments(programId);

        setComments((current) => [
            ...current.filter((comment) => comment.programId !== programId),
            ...fetched,
        ]);
    }

    async function addComment(programId: string, text: string) {
        const newComment = await createProgramComment(programId, text);

        setComments((current) => [...current, newComment]);

        return newComment;
    }

    async function updateComment(id: string, text: string) {
        const existingComment = comments.find((comment) => comment.id === id);

        if (
            !currentUser ||
            !existingComment ||
            existingComment.userId !== currentUser.id
        ) {
            return undefined;
        }

        const updatedComment = await apiUpdateProgramComment(id, text);

        setComments((current) =>
            current.map((comment) =>
                comment.id === id ? updatedComment : comment
            )
        );

        return updatedComment;
    }

    async function deleteComment(id: string) {
        const existingComment = comments.find((comment) => comment.id === id);

        if (
            !currentUser ||
            !existingComment ||
            existingComment.userId !== currentUser.id
        ) {
            return;
        }

        await apiDeleteProgramComment(id);

        setComments((current) =>
            current.filter((comment) => comment.id !== id)
        );
    }

    return (
        <ProgramCommentContext.Provider
            value={{
                comments,
                refreshComments,
                addComment,
                updateComment,
                deleteComment,
            }}
        >
            {children}
        </ProgramCommentContext.Provider>
    );
}

export function useProgramComments() {
    const context = useContext(ProgramCommentContext);

    if (!context) {
        throw new Error(
            "useProgramComments must be used inside ProgramCommentProvider"
        );
    }

    return context;
}
