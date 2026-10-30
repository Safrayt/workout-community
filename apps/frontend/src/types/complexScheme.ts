/**
 * Структурированная схема комплекса: список БЛОКОВ, в блоке — СТРОКИ
 * (упражнения). Зеркало серверных SchemeBlock / SchemeItem.
 *
 * Одной структурой описываются интервалы («3 упражнения по минуте»),
 * круговые схемы с прогрессией, подходы и несколько отдельных суперсетов.
 * Одно упражнение может стоять в схеме сколько угодно раз.
 */

/** «круг» или «подход» — как называть повторы блока. */
export type RoundsKind = "rounds" | "sets";

export type SchemeItem = {
    /** Упражнение из базы упражнений (Exercise.id). */
    exerciseId: string;

    /**
     * Нагрузка. Допустимые сочетания:
     *  - reps                       — «10 повторений»;
     *  - maxEffort                  — «максимум повторений»;
     *  - maxEffort + durationSeconds — «максимум повторений за 60 секунд»;
     *  - durationSeconds            — «30 секунд» (удержание, работа по времени);
     *  - reps + durationSeconds     — «5 повторений за 40 секунд» (минутки).
     */
    reps: number | null;
    maxEffort: boolean;
    durationSeconds: number | null;

    /**
     * Прогрессия по кругам/подходам блока: на сколько меняются повторения
     * на каждом следующем круге (например, −1) и до какой границы
     * (нижней при убывании, верхней при росте).
     */
    repsStep: number;
    repsLimit: number | null;

    note: string | null;
};

export type SchemeBlock = {
    title: string | null;

    /** Сколько раз повторить блок. null — «сколько успеете за лимит времени» (AMRAP). */
    rounds: number | null;
    roundsKind: RoundsKind;

    restBetweenItemsSeconds: number | null;
    restBetweenRoundsSeconds: number | null;
    timeLimitSeconds: number | null;

    items: SchemeItem[];
};

/** Пустой блок для формы: один раз, без упражнений. */
export function createEmptySchemeBlock(): SchemeBlock {
    return {
        title: null,
        rounds: 1,
        roundsKind: "rounds",
        restBetweenItemsSeconds: null,
        restBetweenRoundsSeconds: null,
        timeLimitSeconds: null,
        items: [],
    };
}
