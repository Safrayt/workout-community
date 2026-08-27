import type { Subscription } from "../../types/subscription";
import type { PlaygroundFavorite } from "../../types/favorite";

export type ApiSubscription = {
    id: number;
    follower_id: number;
    following_id: number;
    created_at: string;
};

export function mapApiSubscriptionToSubscription(
    apiSubscription: ApiSubscription
): Subscription {
    return {
        id: String(apiSubscription.id),
        followerId: String(apiSubscription.follower_id),
        followingId: String(apiSubscription.following_id),
        createdAt: apiSubscription.created_at,
    };
}

export type ApiPlaygroundFavorite = {
    id: number;
    user_id: number;
    playground_id: number;
    created_at: string;
};

export function mapApiFavoriteToFavorite(
    apiFavorite: ApiPlaygroundFavorite
): PlaygroundFavorite {
    return {
        id: String(apiFavorite.id),
        userId: String(apiFavorite.user_id),
        playgroundId: String(apiFavorite.playground_id),
        createdAt: apiFavorite.created_at,
    };
}
