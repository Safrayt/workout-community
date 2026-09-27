import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type { EventComment } from "../types/eventComment";

import {
    createEventComment,
    deleteEventComment as apiDeleteEventComment,
    listEventComments,
    updateEventComment as apiUpdateEventComment,
} from "../api/events";

import { useCurrentUser } from "./CurrentUserContext";

type EventCommentContextType = {
    /** Накопительный кеш комментариев по всем мероприятиям, которые уже
     *  загружались через refreshComments — как и в ProgramCommentContext/
     *  ComplexCommentContext, единого эндпоинта "все комментарии сайта"
     *  нет и не нужно. */
    comments: EventComment[];

    refreshComments: (eventId: string) => Promise<void>;

    addComment: (eventId: string, text: string) => Promise<EventComment>;

    updateComment: (
        id: string,
        text: string
    ) => Promise<EventComment | undefined>;

    deleteComment: (id: string) => Promise<void>;
};

const EventCommentContext = createContext<
    EventCommentContextType | undefined
>(undefined);

export function EventCommentProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [comments, setComments] = useState<EventComment[]>([]);

    const { currentUser } = useCurrentUser();

    async function refreshComments(eventId: string) {
        const fetched = await listEventComments(eventId);

        setComments((current) => [
            ...current.filter((comment) => comment.eventId !== eventId),
            ...fetched,
        ]);
    }

    async function addComment(eventId: string, text: string) {
        const newComment = await createEventComment(eventId, text);

        setComments((current) => [...current, newComment]);

        return newComment;
    }

    async function updateComment(id: string, text: string) {
        const existingComment = comments.find((comment) => comment.id === id);

        if (!existingComment || existingComment.userId !== currentUser.id) {
            return undefined;
        }

        const updatedComment = await apiUpdateEventComment(id, text);

        setComments((current) =>
            current.map((comment) =>
                comment.id === id ? updatedComment : comment
            )
        );

        return updatedComment;
    }

    async function deleteComment(id: string) {
        const existingComment = comments.find((comment) => comment.id === id);

        if (!existingComment || existingComment.userId !== currentUser.id) {
            return;
        }

        await apiDeleteEventComment(id);

        setComments((current) =>
            current.filter((comment) => comment.id !== id)
        );
    }

    return (
        <EventCommentContext.Provider
            value={{
                comments,
                refreshComments,
                addComment,
                updateComment,
                deleteComment,
            }}
        >
            {children}
        </EventCommentContext.Provider>
    );
}

export function useEventComments() {
    const context = useContext(EventCommentContext);

    if (!context) {
        throw new Error(
            "useEventComments must be used inside EventCommentProvider"
        );
    }

    return context;
}
