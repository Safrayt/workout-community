import type { Comment } from "../types/comment";

export const comments: Comment[] = [
    {
        id: "1",
        recordId: "1",
        recordType: "workout",
        userId: "2",
        text: "Отличный результат, продолжай в том же духе!",
        createdAt: "2026-06-02T10:00:00.000Z",
    },
    {
        id: "2",
        recordId: "1",
        recordType: "workout",
        userId: "5",
        text: "А на какой площадке снимал? Хочу попробовать там же.",
        createdAt: "2026-06-02T14:30:00.000Z",
    },
    {
        id: "3",
        recordId: "n1",
        recordType: "note",
        userId: "3",
        text: "Узнаю это чувство прогресса, очень мотивирует!",
        createdAt: "2026-07-23T09:15:00.000Z",
    },
];
