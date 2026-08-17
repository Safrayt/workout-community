import type { DiaryRecord } from "../types/diaryRecord";
import type { DiaryDatePrecision } from "../types/diaryFilters";

import { formatWorkoutEntryDateLong } from "./formatWorkoutEntryDate";

/**
 * Годы, за которые в дневнике есть хотя бы одна запись — так же,
 * как список площадок в фильтре строится только по реально
 * посещённым, а не по всем существующим (getPlaygroundsWithEntries).
 * По убыванию: последний год — первым.
 */
export function getYearsWithEntries(
    records: DiaryRecord[]
): string[] {
    const years = new Set(
        records.map((record) => record.date.slice(0, 4))
    );

    return Array.from(years).sort(
        (a, b) => b.localeCompare(a)
    );
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "20 июля 2026" / "Июль 2026" / "2026" — в зависимости от точности. */
export function formatDiaryDateFilterLabel(
    date: string,
    precision: DiaryDatePrecision
): string {
    if (precision === "year") {
        return date;
    }

    if (precision === "month") {
        const [year, month] = date
            .split("-")
            .map(Number);

        const parsedDate = new Date(year, month - 1, 1);

        return capitalize(
            parsedDate.toLocaleDateString(
                "ru-RU",
                {
                    month: "long",
                    year: "numeric",
                }
            )
        );
    }

    return formatWorkoutEntryDateLong(date);
}
