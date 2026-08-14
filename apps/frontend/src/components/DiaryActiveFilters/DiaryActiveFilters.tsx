import TagBadge from "../ui/TagBadge/TagBadge";
import Button from "../ui/Button/Button";

import type { DiaryFilters } from "../../types/diaryFilters";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDateLong } from "../../utils/formatWorkoutEntryDate";

import "../../styles/components/diary-active-filters.css";

type DiaryActiveFiltersProps = {

    filters: DiaryFilters;

    playground?: Playground;

    onChange: (filters: DiaryFilters) => void;

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
                            label={formatWorkoutEntryDateLong(filters.date)}
                            onRemove={() =>
                                onChange({
                                    ...filters,
                                    date: "",
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
                    onChange({
                        playgroundId: "",
                        date: "",
                        tags: [],
                    })
                }
            >
                Сбросить
            </Button>
        </div>
    );
}
