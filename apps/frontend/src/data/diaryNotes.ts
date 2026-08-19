import type { DiaryNote } from "../types/diaryNote";

const now = Date.now();

function hoursAgo(hours: number) {
    return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

function dateDaysAgo(days: number) {
    const date = new Date(now - days * 24 * 60 * 60 * 1000);

    return date.toISOString().slice(0, 10);
}

const today = dateDaysAgo(0);

export const diaryNotes: DiaryNote[] = [
    {
        id: "n1",
        userId: "1",
        date: "2026-07-22",
        title: "Первые 15 подтягиваний",
        text:
            "Сегодня впервые сделал 15 чистых подтягиваний подряд. Долго к этому шёл, приятно видеть прогресс.",
        tags: ["прогресс"],
        createdAt: "2026-07-22T19:10:00",
    },
    {
        id: "n2",
        userId: "1",
        date: "2026-07-18",
        text:
            "Последнюю неделю почти не тренировался — простыл. После болезни решил возвращаться постепенно, начну с лёгкой растяжки.",
        tags: ["отдых", "самочувствие"],
        createdAt: "2026-07-18T08:00:00",
    },
    {
        id: "n3",
        userId: "6",
        playgroundId: "2",
        date: today,
        text:
            "Классная компания сегодня на площадке — подсказали новое упражнение на кольцах, обязательно попробую на следующей тренировке.",
        tags: ["кольца"],
        createdAt: hoursAgo(0.67),
    },
    {
        // Заметка без площадки — карта не должна показывать её,
        // но в ленте она отображается наравне с остальными.
        id: "n4",
        userId: "7",
        date: today,
        text:
            "Решил взять паузу на пару дней — чувствую лёгкую перегрузку в плече, лучше подстраховаться.",
        tags: ["отдых"],
        createdAt: hoursAgo(10),
    },
    {
        // Публикация старше 24 часов — не попадёт на карту
        // активности, но останется видна в Home Feed (UX-HOME §18).
        id: "n5",
        userId: "1",
        date: dateDaysAgo(2),
        text:
            "Возвращаюсь к тренировкам после перерыва — начинаю аккуратно, без фанатизма.",
        tags: ["возвращение"],
        createdAt: hoursAgo(30),
    },
];
