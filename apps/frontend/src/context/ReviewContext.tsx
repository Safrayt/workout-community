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
    createReview,
    deleteReview as apiDeleteReview,
    listPlaygroundReviews,
    updateReview as apiUpdateReview,
} from "../api/reviews";

import {
    useCurrentUser,
} from "./CurrentUserContext";


type ReviewContextType = {
    /**
     * Накопительный кеш отзывов по всем площадкам, которые уже
     * загружались через refreshReviews в этой сессии — а не сразу
     * все отзывы всего сайта (такого эндпоинта на бэкенде нет и не
     * нужно: отзывы всегда показываются в контексте одной конкретной
     * площадки). Компоненты страницы площадки вызывают refreshReviews
     * при монтировании.
     */
    reviews: PlaygroundReview[];

    refreshReviews: (playgroundId: string) => Promise<void>;

    addReview: (
        review: NewReview
    ) => Promise<PlaygroundReview>;

    updateReview: (
        id: string,
        text: string
    ) => Promise<PlaygroundReview | undefined>;

    deleteReview: (
        id: string
    ) => Promise<void>;
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
    ] = useState<PlaygroundReview[]>([]);

    const {
        currentUser,
    } = useCurrentUser();

    async function refreshReviews(playgroundId: string) {
        const fetched = await listPlaygroundReviews(playgroundId);

        setReviews((current) => [
            // Убираем старые отзывы именно этой площадки — свежие
            // данные из fetched их полностью заменяют.
            ...current.filter(
                (review) => review.playgroundId !== playgroundId
            ),
            ...fetched,
        ]);
    }

    async function addReview(
        review: NewReview
    ) {
        const newReview = await createReview(review);

        setReviews(
            (current) => [
                ...current,
                newReview,
            ]
        );

        return newReview;
    }

    async function updateReview(
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

        const updatedReview = await apiUpdateReview(id, text);

        setReviews(
            (current) =>
                current.map(
                    (review) =>
                        review.id === id
                            ? updatedReview
                            : review
                )
        );

        return updatedReview;
    }

    async function deleteReview(
        id: string
    ) {
        const existingReview = reviews.find(
            (review) => review.id === id
        );

        if (
            !existingReview ||
            existingReview.userId !== currentUser.id
        ) {
            return;
        }

        await apiDeleteReview(id);

        setReviews(
            (current) =>
                current.filter(
                    (review) => review.id !== id
                )
        );
    }

    return (
        <ReviewContext.Provider
            value={{
                reviews,
                refreshReviews,
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
