import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type {
    PlaygroundReview,
} from "../types/review";

import type {
    NewReview,
} from "../types/newReview";

import {
    reviews as initialReviews,
} from "../data/reviews";

import {
    useCurrentUser,
} from "./CurrentUserContext";


type ReviewContextType = {
    reviews: PlaygroundReview[];

    addReview: (
        review: NewReview
    ) => PlaygroundReview;

    updateReview: (
        id: string,
        text: string
    ) => PlaygroundReview | undefined;

    deleteReview: (
        id: string
    ) => void;
};


const ReviewContext =
    createContext<
        ReviewContextType | undefined
    >(undefined);


export function ReviewProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [
        reviews,
        setReviews,
    ] = useState<PlaygroundReview[]>(
        initialReviews
    );

    const {
        currentUser,
    } = useCurrentUser();

    function addReview(
        review: NewReview
    ) {
        const newReview: PlaygroundReview = {
            id: crypto.randomUUID(),

            playgroundId: review.playgroundId,

            userId: currentUser.id,

            text: review.text.trim(),

            createdAt: new Date().toISOString(),
        };

        setReviews(
            (current) => [
                ...current,
                newReview,
            ]
        );

        return newReview;
    }

    function updateReview(
        id: string,
        text: string
    ) {
        const existingReview = reviews.find(
            (review) => review.id === id
        );

        if (
            !existingReview ||
            existingReview.userId !== currentUser.id
        ) {
            return undefined;
        }

        const trimmedText = text.trim();

        setReviews(
            (current) =>
                current.map(
                    (review) =>
                        review.id === id
                            ? { ...review, text: trimmedText }
                            : review
                )
        );

        return {
            ...existingReview,
            text: trimmedText,
        };
    }

    function deleteReview(
        id: string
    ) {
        setReviews(
            (current) =>
                current.filter(
                    (review) =>
                        !(
                            review.id === id &&
                            review.userId === currentUser.id
                        )
                )
        );
    }

    return (
        <ReviewContext.Provider
            value={{
                reviews,
                addReview,
                updateReview,
                deleteReview,
            }}
        >
            {children}
        </ReviewContext.Provider>
    );
}


export function useReviews() {
    const context =
        useContext(
            ReviewContext
        );

    if (!context) {
        throw new Error(
            "useReviews must be used inside ReviewProvider"
        );
    }

    return context;
}
