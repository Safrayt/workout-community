export function formatDateKey(
    year: number,
    month: number,
    day: number
): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Возвращает сетку дней месяца по неделям, начиная с понедельника.
 * Дни за пределами месяца — null, чтобы ячейка оставалась пустой.
 */
export function getMonthMatrix(
    year: number,
    month: number
): (number | null)[][] {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // getDay(): 0 = воскресенье. Переводим в понедельник-first (0 = Пн).
    const firstWeekday = (firstDay.getDay() + 6) % 7;

    const cells: (number | null)[] = [
        ...Array(firstWeekday).fill(null),
        ...Array.from(
            { length: daysInMonth },
            (_, index) => index + 1
        ),
    ];

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const weeks: (number | null)[][] = [];

    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
}

export function formatMonthTitle(
    year: number,
    month: number
): string {
    const date = new Date(year, month, 1);

    const title = date.toLocaleDateString(
        "ru-RU",
        {
            month: "long",
            year: "numeric",
        }
    );

    return title.charAt(0).toUpperCase() + title.slice(1);
}
