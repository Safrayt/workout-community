const MONTHS_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
];

/**
 * "Участник с августа 2026" — без точной даты до дня, она обычно
 * не нужна (UX-PROFILE §18).
 */
export function formatRegistrationDate(
    createdAt: string
) {
    const date = new Date(createdAt);

    const month = MONTHS_GENITIVE[date.getMonth()];
    const year = date.getFullYear();

    return `Участник с ${month} ${year}`;
}
