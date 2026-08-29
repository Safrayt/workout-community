import { useMemo, useState } from "react";

import Input from "../ui/Input/Input";

import "../../styles/components/diary-entry-picker.css";

import type { WorkoutEntry } from "../../types/workoutEntry";

import { formatDate } from "../../utils/formatDate";

type DiaryEntryPickerProps = {

    entries: WorkoutEntry[];

    selectedEntryId?: string;

    onSelect: (entryId: string) => void;

};

export default function DiaryEntryPicker({
    entries,
    selectedEntryId,
    onSelect,
}: DiaryEntryPickerProps) {
    const [query, setQuery] = useState("");

    const sortedAndFiltered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        const filtered = normalizedQuery
            ? entries.filter((entry) => {
                  const haystack = `${entry.title} ${entry.description ?? ""} ${entry.date}`
                      .toLowerCase();

                  return haystack.includes(normalizedQuery);
              })
            : entries;

        // Ближайшие к сегодняшней дате записи — первыми (п.17 документа).
        const today = Date.now();

        return [...filtered].sort(
            (a, b) =>
                Math.abs(new Date(a.date).getTime() - today) -
                Math.abs(new Date(b.date).getTime() - today)
        );
    }, [entries, query]);

    return (
        <div className="diary-entry-picker">
            <Input
                id="diary-entry-picker-search"
                label="Найти запись дневника"
                placeholder="Поиск по дате или содержимому"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />

            <div className="diary-entry-picker__list">
                {
                    sortedAndFiltered.length === 0 && (
                        <p className="diary-entry-picker__empty">
                            Ничего не найдено.
                        </p>
                    )
                }

                {
                    sortedAndFiltered.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={
                                entry.id === selectedEntryId
                                    ? "diary-entry-picker__item diary-entry-picker__item--selected"
                                    : "diary-entry-picker__item"
                            }
                            onClick={() => onSelect(entry.id)}
                        >
                            <span className="diary-entry-picker__date">
                                {formatDate(entry.date)}
                            </span>

                            <span className="diary-entry-picker__title">
                                {entry.title}
                            </span>

                            {
                                entry.description && (
                                    <span className="diary-entry-picker__description">
                                        {entry.description}
                                    </span>
                                )
                            }
                        </button>
                    ))
                }
            </div>
        </div>
    );
}
