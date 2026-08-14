import { useState } from "react";

import TagBadge from "../ui/TagBadge/TagBadge";
import Input from "../ui/Input/Input";

import "../../styles/components/diary-tag-filter.css";

const QUICK_TAGS_LIMIT = 8;

type DiaryTagFilterProps = {

    /** Все теги пользователя (до 50 штук). */
    tags: string[];

    selectedTags: string[];

    onChange: (tags: string[]) => void;

};

/**
 * Фильтр по тегам (UX-DIARY §16–18). При 50 личных тегах нельзя
 * показать все плашками сразу — показываем первые несколько как
 * быстрый доступ, остальное — через поиск (аналог dropdown/popover
 * из спеки, упрощённый для MVP: разворачиваемый список с поиском).
 * Несколько тегов работают по AND (см. utils/diaryFilters.ts).
 */
export default function DiaryTagFilter({
    tags,
    selectedTags,
    onChange,
}: DiaryTagFilterProps) {
    const [isExpanded, setIsExpanded] =
        useState(false);

    const [search, setSearch] =
        useState("");

    function toggleTag(tag: string) {
        onChange(
            selectedTags.includes(tag)
                ? selectedTags.filter((item) => item !== tag)
                : [...selectedTags, tag]
        );
    }

    if (tags.length === 0) {
        return null;
    }

    const quickTags = tags.slice(0, QUICK_TAGS_LIMIT);
    const hasMoreTags = tags.length > QUICK_TAGS_LIMIT;

    const searchResults = search.trim()
        ? tags.filter(
            (tag) =>
                tag
                    .toLowerCase()
                    .includes(search.trim().toLowerCase())
        )
        : tags;

    return (
        <div className="diary-tag-filter">
            <div className="tag-list">
                {
                    quickTags.map((tag) => (
                        <TagBadge
                            key={tag}
                            label={tag}
                            active={selectedTags.includes(tag)}
                            onClick={() => toggleTag(tag)}
                        />
                    ))
                }

                {
                    hasMoreTags && (
                        <button
                            type="button"
                            className="diary-tag-filter__more"
                            onClick={() =>
                                setIsExpanded((current) => !current)
                            }
                        >
                            {
                                isExpanded
                                    ? "Скрыть"
                                    : `Ещё теги (${tags.length - QUICK_TAGS_LIMIT})`
                            }
                        </button>
                    )
                }
            </div>

            {
                isExpanded && (
                    <div className="diary-tag-filter__panel">
                        <Input
                            placeholder="Поиск тега"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <div className="tag-list">
                            {
                                searchResults.length > 0 ? (
                                    searchResults.map((tag) => (
                                        <TagBadge
                                            key={tag}
                                            label={tag}
                                            active={selectedTags.includes(tag)}
                                            onClick={() => toggleTag(tag)}
                                        />
                                    ))
                                ) : (
                                    <p className="diary-tag-filter__no-results">
                                        Ничего не найдено
                                    </p>
                                )
                            }
                        </div>
                    </div>
                )
            }
        </div>
    );
}
