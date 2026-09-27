import type { Notification, NotificationType } from "../../types/notification";

export type ApiNotification = {
    id: number;
    type: NotificationType;
    target_url: string;
    target_title: string | null;
    is_read: boolean;
    user_id: number;
    actor_id: number;
    created_at: string;
};

export function mapApiNotificationToNotification(
    apiNotification: ApiNotification
): Notification {
    return {
        id: String(apiNotification.id),
        type: apiNotification.type,
        targetUrl: apiNotification.target_url,
        targetTitle: apiNotification.target_title ?? undefined,
        isRead: apiNotification.is_read,
        createdAt: apiNotification.created_at,
    };
}
