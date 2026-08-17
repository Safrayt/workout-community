import {
    createContext,
    useContext,
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
    comments as initialComments,
} from "../data/comments";

import {
    useCurrentUser,
} from "./CurrentUserContext";


type CommentContextType = {
    comments: Comment[];

    addComment: (
        recordId: string,
        recordType: DiaryRecordType,
        text: string
    ) => Comment;

    updateComment: (
        id: string,
        text: string
    ) => Comment | undefined;

    deleteComment: (
        id: string
    ) => void;
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
    ] = useState<Comment[]>(
        initialComments
    );

    const {
        currentUser,
    } = useCurrentUser();

    function addComment(
        recordId: string,
        recordType: DiaryRecordType,
        text: string
    ) {
        const newComment: Comment = {
            id: crypto.randomUUID(),

            recordId,

            recordType,

            userId: currentUser.id,

            text: text.trim(),

            createdAt: new Date().toISOString(),
        };

        setComments(
            (current) => [
                ...current,
                newComment,
            ]
        );

        return newComment;
    }

    function updateComment(
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

        const trimmedText = text.trim();

        setComments(
            (current) =>
                current.map(
                    (comment) =>
                        comment.id === id
                            ? { ...comment, text: trimmedText }
                            : comment
                )
        );

        return {
            ...existingComment,
            text: trimmedText,
        };
    }

    function deleteComment(
        id: string
    ) {
        setComments(
            (current) =>
                current.filter(
                    (comment) =>
                        !(
                            comment.id === id &&
                            comment.userId === currentUser.id
                        )
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
