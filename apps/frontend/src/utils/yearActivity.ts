/**
 * Активность за год для профиля (как «contributions in the last year» на
 * GitHub): сетка недель × дней, в каждой клетке — были ли в этот день
 * тренировочные записи и заметки дневника.
 */

export type YearActivityDay = {
    /** «2026-11-19» — день по местному времени. */
    date: string;

    workouts: number;
    notes: number;
};

export type YearActivityMonth = {
    label: string;

    /** Номер недели (столбца) сетки, с 0. */
    column: number;
};

export type YearActivity = {
    /**
     * Недели слева направо; в каждой семь дней, с понедельника. null —
     * день вне года (до начала периода и после сегодняшнего дня).
     */
    weeks: (YearActivityDay | null)[][];

    months: YearActivityMonth[];

    totalWorkouts: number;
    totalNotes: number;
};

const DAYS_IN_PERIOD = 365;

/** Минимум столбцов между подписями месяцев, чтобы они не слипались. */
const MIN_MONTH_LABEL_GAP = 3;

const MONTH_LABELS = [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
];

/** Дата по местному времени как «ГГГГ-ММ-ДД». */
export function toLocalIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}

/** День со сдвигом без накопления ошибки на переводе часов. */
function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Понедельник = 0 … воскресенье = 6. */
function weekdayIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
}

function countByDay(dates: string[]): Map<string, number> {
    const counts = new Map<string, number>();

    dates.forEach((raw) => {
        // Дата может прийти с временем («2026-11-19T10:00») — берём день.
        const day = raw.slice(0, 10);

        counts.set(day, (counts.get(day) ?? 0) + 1);
    });

    return counts;
}

/**
 * Последние 365 дней по сегодняшний включительно. Неделя начинается с
 * понедельника, последний столбец — текущая неделя.
 */
export function buildYearActivity(
    workoutDates: string[],
    noteDates: string[],
    today: Date = new Date()
): YearActivity {
    const workouts = countByDay(workoutDates);
    const notes = countByDay(noteDates);

    const todayDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    const periodStart = addDays(todayDay, -(DAYS_IN_PERIOD - 1));
    const gridStart = addDays(periodStart, -weekdayIndex(periodStart));

    const totalDays =
        Math.round(
            (todayDay.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;
    const weeksCount = Math.ceil(totalDays / 7);

    const todayIso = toLocalIsoDate(todayDay);
    const periodStartIso = toLocalIsoDate(periodStart);

    let totalWorkouts = 0;
    let totalNotes = 0;

    const weeks: (YearActivityDay | null)[][] = [];
    const months: YearActivityMonth[] = [];
    let previousMonth = -1;

    for (let week = 0; week < weeksCount; week += 1) {
        const days: (YearActivityDay | null)[] = [];

        for (let weekday = 0; weekday < 7; weekday += 1) {
            const date = addDays(gridStart, week * 7 + weekday);
            const iso = toLocalIsoDate(date);

            if (iso < periodStartIso || iso > todayIso) {
                days.push(null);
                continue;
            }

            const dayWorkouts = workouts.get(iso) ?? 0;
            const dayNotes = notes.get(iso) ?? 0;

            totalWorkouts += dayWorkouts;
            totalNotes += dayNotes;

            days.push({ date: iso, workouts: dayWorkouts, notes: dayNotes });
        }

        weeks.push(days);

        // Подпись месяца — над первой неделей, где он начинается.
        const firstDay = days.find((day) => day !== null);

        if (firstDay) {
            const month = Number(firstDay.date.slice(5, 7)) - 1;

            if (month !== previousMonth) {
                months.push({ label: MONTH_LABELS[month], column: week });
                previousMonth = month;
            }
        }
    }

    // Первая подпись может оказаться вплотную ко второй (период начался
    // в конце месяца) — тогда её не показываем.
    if (
        months.length > 1 &&
        months[1].column - months[0].column < MIN_MONTH_LABEL_GAP
    ) {
        months.shift();
    }

    return { weeks, months, totalWorkouts, totalNotes };
}
