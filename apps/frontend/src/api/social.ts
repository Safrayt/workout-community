import { apiFetch, buildQuery } from "./client";
import {
    mapApiFavoriteToFavorite,
    mapApiSubscriptionToSubscription,
    type ApiPlaygroundFavorite,
    type ApiSubscription,
} from "./mappers/social";

import type { Subscription } from "../types/subscription";
import type { PlaygroundFavorite } from "../types/favorite";

// =====================================================================
// Подписки
// =====================================================================

export async function listSubscriptions(
    followerId: string
): Promise<Subscription[]> {
    const apiSubscriptions = await apiFetch<ApiSubscription[]>(
        `/subscriptions${buildQuery({ follower_id: followerId })}`
    );

    return apiSubscriptions.map(mapApiSubscriptionToSubscription);
}

export async function subscribeToUser(
    followingId: string
): Promise<Subscription> {
    const apiSubscription = await apiFetch<ApiSubscription>(
        `/subscriptions/${followingId}`,
        { method: "POST" }
    );

    return mapApiSubscriptionToSubscription(apiSubscription);
}

export async function unsubscribeFromUser(
    followingId: string
): Promise<void> {
    await apiFetch(`/subscriptions/${followingId}`, { method: "DELETE" });
}

// =====================================================================
// Избранные площадки
// =====================================================================

export async function listFavorites(): Promise<PlaygroundFavorite[]> {
    const apiFavorites = await apiFetch<ApiPlaygroundFavorite[]>(
        "/favorites"
    );

    return apiFavorites.map(mapApiFavoriteToFavorite);
}

export async function addFavoritePlayground(
    playgroundId: string
): Promise<PlaygroundFavorite> {
    const apiFavorite = await apiFetch<ApiPlaygroundFavorite>(
        `/favorites/${playgroundId}`,
        { method: "POST" }
    );

    return mapApiFavoriteToFavorite(apiFavorite);
}

export async function removeFavoritePlayground(
    playgroundId: string
): Promise<void> {
    await apiFetch(`/favorites/${playgroundId}`, { method: "DELETE" });
}
