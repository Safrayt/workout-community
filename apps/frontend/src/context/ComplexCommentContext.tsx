import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type { ComplexComment } from "../types/complexComment";

import {
    createComplexComment,
    deleteComplexComment as apiDeleteComplexComment,
    listComplexComments,
    updateComplexComment as apiUpdateComplexComment,
} from "../api/complexes";

import { useCurrentUser } from "./CurrentUserContext";

type ComplexCommentContextType = {
    /**
     * Накопительный кеш комментариев по всем комплексам, которые уже
     * загружались через refreshComments в этой сессии — как и
     * reviews в ReviewContext, глобального эндпоинта "все комментарии
     * сайта" нет и не нужно: комментарии всегда показываются в
     * контексте одного конкретного комплекса.
     */
    comments: ComplexComment[];

    refreshComments: (complexId: string) => Promise<void>;

    addComment: (
        complexId: string,
        text: string
    ) => Promise<ComplexComment>;

    updateComment: (
        id: string,
        text: string
    ) => Promise<ComplexComment | undefined>;

    deleteComment: (id: string) => Promise<void>;
};

const ComplexCommentContext = createContext<
    ComplexCommentContextType | undefined
>(undefined);

export function ComplexCommentProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [comments, setComments] = useState<ComplexComment[]>([]);

    const { currentUser } = useCurrentUser();

    async function refreshComments(complexId: string) {
        const fetched = await listComplexComments(complexId);

        setComments((current) => [
            // Убираем старые комментарии именно этого комплекса —
            // свежие данные из fetched их полностью заменяют.
            ...current.filter(
                (comment) => comment.complexId !== complexId
            ),
            ...fetched,
        ]);
    }

    async function addComment(complexId: string, text: string) {
        const newComment = await createComplexComment(complexId, text);

        setComments((current) => [...current, newComment]);

        return newComment;
    }

    async function updateComment(id: string, text: string) {
        const existingComment = comments.find(
            (comment) => comment.id === id
        );

        // На бэкенде это и так под запретом (403) даже для админа —
        // здесь просто не даём отправить заведомо обречённый запрос.
        if (!existingComment || existingComment.userId !== currentUser.id) {
            return undefined;
        }

        const updatedComment = await apiUpdateComplexComment(id, text);

        setComments((current) =>
            current.map((comment) =>
                comment.id === id ? updatedComment : comment
            )
        );

        return updatedComment;
    }

    async function deleteComment(id: string) {
        const existingComment = comments.find(
            (comment) => comment.id === id
        );

        if (!existingComment || existingComment.userId !== currentUser.id) {
            return;
        }

        await apiDeleteComplexComment(id);

        setComments((current) =>
            current.filter((comment) => comment.id !== id)
        );
    }

    return (
        <ComplexCommentContext.Provider
            value={{
                comments,
                refreshComments,
                addComment,
                updateComment,
                deleteComment,
            }}
        >
            {children}
        </ComplexCommentContext.Provider>
    );
}

export function useComplexComments() {
    const context = useContext(ComplexCommentContext);

    if (!context) {
        throw new Error(
            "useComplexComments must be used inside ComplexCommentProvider"
        );
    }

    return context;
}
