import type { PlaygroundReview } from "../types/review";

export const RECENT_REVIEWS_LIMIT = 3;

/**
 * Отзывы конкретной площадки, отсортированные от новых к старым.
 */
export function getPlaygroundReviews(
    reviews: PlaygroundReview[],
    playgroundId: string
) {
    return reviews
        .filter(
            (review) => review.playgroundId === playgroundId
        )
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );
}

/**
 * Первые limit (по умолчанию 3) последних отзывов площадки —
 * то, что показывается прямо на странице площадки.
 */
export function getRecentPlaygroundReviews(
    reviews: PlaygroundReview[],
    playgroundId: string,
    limit: number = RECENT_REVIEWS_LIMIT
) {
    return getPlaygroundReviews(
        reviews,
        playgroundId
    ).slice(0, limit);
}
