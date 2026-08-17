import type { Subscription } from "../types/subscription";

export const subscriptions: Subscription[] = [
    {
        id: "1",
        followerId: "1",
        followingId: "2",
        createdAt: "2026-06-01",
    },
    {
        id: "2",
        followerId: "1",
        followingId: "5",
        createdAt: "2026-06-14",
    },
    {
        id: "3",
        followerId: "1",
        followingId: "7",
        createdAt: "2026-07-02",
    },
    {
        id: "4",
        followerId: "2",
        followingId: "1",
        createdAt: "2026-05-20",
    },
    {
        id: "5",
        followerId: "3",
        followingId: "1",
        createdAt: "2026-06-10",
    },
    {
        id: "6",
        followerId: "4",
        followingId: "2",
        createdAt: "2026-04-18",
    },
    {
        id: "7",
        followerId: "4",
        followingId: "5",
        createdAt: "2026-05-02",
    },
];
