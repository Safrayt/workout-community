import type { TimeOfDay } from "../types/workoutEntry";

export function getTimeOfDayName(
    timeOfDay: TimeOfDay
) {
    switch (timeOfDay) {
        case "morning":
            return "Утро";

        case "day":
            return "День";

        case "evening":
            return "Вечер";

        case "night":
            return "Ночь";
    }
}

export const timeOfDayOptions = [
    { value: "morning", label: "Утро" },
    { value: "day", label: "День" },
    { value: "evening", label: "Вечер" },
    { value: "night", label: "Ночь" },
];