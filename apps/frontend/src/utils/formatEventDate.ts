export function formatEventDate(
    startDate: string
) {
    const date = new Date(startDate);

    const weekday = date.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long",
        }
    );

    const formattedDate = date.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        }
    );

    const time = date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );

    return `${capitalize(weekday)} • ${formattedDate} • ${time}`;
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}