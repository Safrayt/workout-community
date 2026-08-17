import type { Subscription } from "../types/subscription";

export function isSubscribed(
    subscriptions: Subscription[],
    followerId: string,
    followingId: string
) {
    return subscriptions.some(
        (subscription) =>
            subscription.followerId === followerId &&
            subscription.followingId === followingId
    );
}

/** id-ы пользователей, на которых подписан followerId, от новых к старым. */
export function getFollowingIds(
    subscriptions: Subscription[],
    followerId: string
) {
    return subscriptions
        .filter(
            (subscription) =>
                subscription.followerId === followerId
        )
        .sort(
            (a, b) =>
                b.createdAt.localeCompare(a.createdAt)
        )
        .map((subscription) => subscription.followingId);
}
