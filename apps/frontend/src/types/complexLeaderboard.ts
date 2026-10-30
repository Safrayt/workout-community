/**
 * Строка рейтинга комплекса. Очки (value) — значение основного
 * показателя ЛУЧШЕГО выполнения пользователя: секунды для временных
 * комплексов, иначе количество (повторений и т.д.). Звёзды в рейтинге
 * не участвуют. См. ComplexLeaderboardRow в app/models_complex.py.
 */
export type ComplexLeaderboardRow = {
    rank: number;
    userId: string;
    nickname: string;
    value: number;
    /** Строка текущего пользователя (у гостя всегда false). */
    isMe: boolean;
};

export type ComplexLeaderboard = {
    /** Сколько всего участников в рейтинге, а не строк в ответе. */
    total: number;
    rows: ComplexLeaderboardRow[];
};
