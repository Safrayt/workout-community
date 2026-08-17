import TagBadge from "../ui/TagBadge/TagBadge";
import Button from "../ui/Button/Button";

import type { DiaryFilters } from "../../types/diaryFilters";
import type { Playground } from "../../types/playground";

import { emptyDiaryFilters } from "../../types/diaryFilters";
import { formatDiaryDateFilterLabel } from "../../utils/diaryDateFilter";

import "../../styles/components/diary-active-filters.css";

type DiaryActiveFiltersProps = {

    filters: DiaryFilters;

    playground?: Playground;

    onChange: (filters: DiaryFilters) => void;

};

const RECORD_TYPE_LABELS: Record<string, string> = {
    workout: "Тренировки",
    note: "Заметки",
};

/**
 * Строка активных фильтров — всегда прямо перед списком записей,
 * чтобы пользователь понимал, почему список содержит именно эти
 * записи (UX-DIARY §19).
 */
export default function DiaryActiveFilters({
    filters,
    playground,
    onChange,
}: DiaryActiveFiltersProps) {
    const hasAny =
        filters.recordType !== "all" ||
        Boolean(filters.playgroundId) ||
        Boolean(filters.date) ||
        filters.tags.length > 0;

    if (!hasAny) {
        return null;
    }

    return (
        <div className="diary-active-filters">
            <span className="diary-active-filters__label">
                Фильтры:
            </span>

            <div className="tag-list">
                {
                    filters.recordType !== "all" && (
                        <TagBadge
                            label={RECORD_TYPE_LABELS[filters.recordType]}
                            onRemove={() =>
                                onChange({
                                    ...filters,
                                    recordType: "all",
                                })
                            }
                        />
                    )
                }

                {
                    filters.playgroundId && (
                        <TagBadge
                            label={`Площадка: ${playground?.name ?? "..."}`}
                            onRemove={() =>
                                onChange({
                                    ...filters,
                                    playgroundId: "",
                                })
                            }
                        />
                    )
                }

                {
                    filters.date && (
                        <TagBadge
                            label={
                                formatDiaryDateFilterLabel(
                                    filters.date,
                                    filters.datePrecision
                                )
                            }
                            onRemove={() =>
                                onChange({
                                    ...filters,
                                    date: "",
                                    datePrecision: "day",
                                })
                            }
                        />
                    )
                }

                {
                    filters.tags.map((tag) => (
                        <TagBadge
                            key={tag}
                            label={`#${tag}`}
                            onRemove={() =>
                                onChange({
                                    ...filters,
                                    tags: filters.tags.filter(
                                        (item) => item !== tag
                                    ),
                                })
                            }
                        />
                    ))
                }
            </div>

            <Button
                variant="outline"
                onClick={() =>
                    onChange(emptyDiaryFilters)
                }
            >
                Сбросить
            </Button>
        </div>
    );
}
