export type NotificationType =
    | "diary_comment"
    | "playground_comment"
    | "event_comment"
    | "mention";

export type Notification = {
    id: string;
    type: NotificationType;
    targetUrl: string;
    targetTitle?: string;
    isRead: boolean;
    createdAt: string;
};
