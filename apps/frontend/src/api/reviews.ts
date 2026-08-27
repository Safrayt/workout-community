import { apiFetch, buildQuery } from "./client";
import {
    mapApiReviewToReview,
    type ApiReview,
} from "./mappers/review";

import type { PlaygroundReview } from "../types/review";
import type { NewReview } from "../types/newReview";

export async function listPlaygroundReviews(
    playgroundId: string
): Promise<PlaygroundReview[]> {
    const apiReviews = await apiFetch<ApiReview[]>(
        `/reviews/${buildQuery({ playground_id: playgroundId })}`
    );

    return apiReviews.map(mapApiReviewToReview);
}

export async function createReview(
    review: NewReview
): Promise<PlaygroundReview> {
    const apiReview = await apiFetch<ApiReview>("/reviews/", {
        method: "POST",
        body: {
            playground_id: Number(review.playgroundId),
            text: review.text,
        },
    });

    return mapApiReviewToReview(apiReview);
}

export async function updateReview(
    id: string,
    text: string
): Promise<PlaygroundReview> {
    const apiReview = await apiFetch<ApiReview>(`/reviews/${id}`, {
        method: "PUT",
        body: { text },
    });

    return mapApiReviewToReview(apiReview);
}

export async function deleteReview(id: string): Promise<void> {
    await apiFetch(`/reviews/${id}`, { method: "DELETE" });
}
