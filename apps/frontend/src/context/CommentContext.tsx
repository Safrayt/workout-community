import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    Comment,
} from "../types/comment";

import type {
    DiaryRecordType,
} from "../types/diaryRecord";

import {
    addComment as apiAddComment,
    deleteComment as apiDeleteComment,
    listAllComments,
    updateComment as apiUpdateComment,
} from "../api/diary";

import {
    useCurrentUser,
} from "./CurrentUserContext";


type CommentContextType = {
    comments: Comment[];

    addComment: (
        recordId: string,
        recordType: DiaryRecordType,
        text: string
    ) => Promise<Comment>;

    updateComment: (
        id: string,
        text: string
    ) => Promise<Comment | undefined>;

    deleteComment: (
        id: string
    ) => Promise<void>;
};


const CommentContext =
    createContext<
        CommentContextType | undefined
    >(undefined);


export function CommentProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [
        comments,
        setComments,
    ] = useState<Comment[]>([]);

    const {
        currentUser,
    } = useCurrentUser();

    useEffect(() => {
        listAllComments()
            .then(setComments)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить комментарии:",
                    error
                );
            });
    }, []);

    async function addComment(
        recordId: string,
        recordType: DiaryRecordType,
        text: string
    ) {
        const newComment =
            await apiAddComment(recordId, recordType, text);

        setComments(
            (current) => [
                ...current,
                newComment,
            ]
        );

        return newComment;
    }

    async function updateComment(
        id: string,
        text: string
    ) {
        const existingComment = comments.find(
            (comment) => comment.id === id
        );

        if (
            !existingComment ||
            existingComment.userId !== currentUser.id
        ) {
            return undefined;
        }

        const updatedComment =
            await apiUpdateComment(id, text);

        setComments(
            (current) =>
                current.map(
                    (comment) =>
                        comment.id === id
                            ? updatedComment
                            : comment
                )
        );

        return updatedComment;
    }

    async function deleteComment(
        id: string
    ) {
        const existingComment = comments.find(
            (comment) => comment.id === id
        );

        if (
            !existingComment ||
            existingComment.userId !== currentUser.id
        ) {
            return;
        }

        await apiDeleteComment(id);

        setComments(
            (current) =>
                current.filter(
                    (comment) => comment.id !== id
                )
        );
    }

    return (
        <CommentContext.Provider
            value={{
                comments,
                addComment,
                updateComment,
                deleteComment,
            }}
        >
            {children}
        </CommentContext.Provider>
    );
}


export function useComments() {
    const context =
        useContext(
            CommentContext
        );

    if (!context) {
        throw new Error(
            "useComments must be used inside CommentProvider"
        );
    }

    return context;
}
