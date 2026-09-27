import { apiFetch, buildQuery } from "./client";
import {
    mapApiNotificationToNotification,
    type ApiNotification,
} from "./mappers/notification";

import type { Notification, NotificationType } from "../types/notification";

export async function listNotifications(
    type?: NotificationType
): Promise<Notification[]> {
    const apiNotifications = await apiFetch<ApiNotification[]>(
        `/notifications/${buildQuery({ type })}`
    );

    return apiNotifications.map(mapApiNotificationToNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
    const result = await apiFetch<{ count: number }>(
        "/notifications/unread-count"
    );

    return result.count;
}

export async function markNotificationAsRead(
    id: string
): Promise<Notification> {
    const apiNotification = await apiFetch<ApiNotification>(
        `/notifications/${id}/read`,
        { method: "POST" }
    );

    return mapApiNotificationToNotification(apiNotification);
}

export async function markAllNotificationsAsRead(): Promise<void> {
    await apiFetch("/notifications/read-all", { method: "POST" });
}
