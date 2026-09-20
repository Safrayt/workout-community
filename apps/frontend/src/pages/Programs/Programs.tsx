import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Select from "../../components/ui/Select/Select";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import ProgramCard from "../../components/ProgramCard/ProgramCard";

import "../../styles/components/programs-page.css";

import { usePrograms } from "../../context/ProgramContext";

import {
    programDifficultyFilterOptions,
} from "../../constants/programTypes";
import type { ProgramDifficulty } from "../../types/program";

type ScopeFilter = "all" | "favorites";
type SortOption = "newest" | "popularity";

const scopeFilterOptions = [
    { value: "all", label: "Все программы" },
    { value: "favorites", label: "Избранные" },
];

const sortOptions = [
    { value: "newest", label: "По дате создания" },
    { value: "popularity", label: "По популярности" },
];

export default function Programs() {
    const { programs, isLoading } = usePrograms();

    const [difficultyFilter, setDifficultyFilter] = useState<
        ProgramDifficulty | ""
    >("");
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("newest");

    const filteredPrograms = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return programs
            .filter((program) => {
                if (difficultyFilter && program.difficulty !== difficultyFilter) {
                    return false;
                }

                if (scopeFilter === "favorites" && !program.isFavoritedByViewer) {
                    return false;
                }

                if (normalizedQuery) {
                    const matchesTitle = program.title
                        .toLowerCase()
                        .includes(normalizedQuery);
                    const matchesAuthor = program.authorNickname
                        .toLowerCase()
                        .includes(normalizedQuery);

                    if (!matchesTitle && !matchesAuthor) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === "popularity") {
                    return b.favoritesCount - a.favoritesCount;
                }

                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );
            });
    }, [programs, difficultyFilter, scopeFilter, searchQuery, sortBy]);

    return (
        <div className="programs-page">
            <div className="programs-page__header">
                <h1 className="programs-page__title">Программы тренировок</h1>

                <Link to="/programs/create">
                    <Button type="button" variant="primary">
                        Создать программу
                    </Button>
                </Link>
            </div>

            <Input
                id="program-search"
                label="Поиск по названию или автору"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Например: турники или nickname"
            />

            <div className="programs-page__filters">
                <Select
                    id="program-scope-filter"
                    label="Показать"
                    value={scopeFilter}
                    onChange={(event) =>
                        setScopeFilter(event.target.value as ScopeFilter)
                    }
                    options={scopeFilterOptions}
                />

                <Select
                    id="program-difficulty-filter"
                    label="Сложность"
                    value={difficultyFilter}
                    onChange={(event) =>
                        setDifficultyFilter(
                            event.target.value as ProgramDifficulty | ""
                        )
                    }
                    options={programDifficultyFilterOptions}
                    emptyOptionLabel="Любая"
                />

                <Select
                    id="program-sort"
                    label="Сортировка"
                    value={sortBy}
                    onChange={(event) =>
                        setSortBy(event.target.value as SortOption)
                    }
                    options={sortOptions}
                />
            </div>

            {
                isLoading ? (
                    <p className="programs-page__loading">Загрузка каталога…</p>
                ) : filteredPrograms.length === 0 ? (
                    <p className="programs-page__empty">
                        По выбранным фильтрам программ не найдено.
                    </p>
                ) : (
                    <div className="programs-page__grid">
                        {
                            filteredPrograms.map((program) => (
                                <ProgramCard key={program.id} program={program} />
                            ))
                        }
                    </div>
                )
            }
        </div>
    );
}

