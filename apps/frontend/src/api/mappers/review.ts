import type { PlaygroundReview } from "../../types/review";

export type ApiReview = {
    id: number;
    playground_id: number;
    user_id: number;
    text: string;
    created_at: string;
};

export function mapApiReviewToReview(
    apiReview: ApiReview
): PlaygroundReview {
    return {
        id: String(apiReview.id),
        playgroundId: String(apiReview.playground_id),
        userId: String(apiReview.user_id),
        text: apiReview.text,
        createdAt: apiReview.created_at,
    };
}
