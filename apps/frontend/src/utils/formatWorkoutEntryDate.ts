export function formatWorkoutEntryDate(
    date: string
) {
    const parsedDate = new Date(date);

    const weekday = parsedDate.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long",
        }
    );

    const formattedDate = parsedDate.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );

    return `${capitalize(weekday)} • ${formattedDate}`;
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}