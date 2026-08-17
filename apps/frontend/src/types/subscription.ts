export type Subscription = {
    id: string;

    /** Кто подписался. */
    followerId: string;

    /** На кого подписался. */
    followingId: string;

    createdAt: string;
};
