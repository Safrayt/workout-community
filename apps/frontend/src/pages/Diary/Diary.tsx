import { Link } from "react-router-dom";

import { useState } from "react";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";
import Input from "../../components/ui/Input/Input";
import Pagination from "../../components/ui/Pagination/Pagination";

import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";
import DiaryStats from "../../components/DiaryStats/DiaryStats";
import DiaryMap from "../../components/DiaryMap/DiaryMap";
import WorkoutCalendar from "../../components/WorkoutCalendar/WorkoutCalendar";
import DiaryTagFilter from "../../components/DiaryTagFilter/DiaryTagFilter";
import DiaryActiveFilters from "../../components/DiaryActiveFilters/DiaryActiveFilters";

import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import "../../styles/components/diary.css";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getUserWorkoutEntries,
} from "../../utils/workoutEntries";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getUserTags,
} from "../../utils/workoutTags";

import {
    emptyDiaryFilters,
} from "../../types/diaryFilters";

import {
    filterDiaryEntries,
    hasActiveDiaryFilters,
    getEntryCountsByDate,
    getPlaygroundsWithEntries,
} from "../../utils/diaryFilters";

import {
    paginate,
    getTotalPages,
} from "../../utils/pagination";

import { pluralizeRu } from "../../utils/pluralize";

export default function Diary() {
    const {
        entries,
    } = useWorkoutDiary();

    const {
        currentUser,
    } = useCurrentUser();

    const {
        playgrounds,
    } = usePlaygrounds();

    const [filters, setFilters] =
        useState(emptyDiaryFilters);

    const [page, setPage] =
        useState(1);

    const userEntries =
        getUserWorkoutEntries(
            entries,
            currentUser.id
        );

    // Новые записи сверху (UX §27).
    const sortedEntries = [...userEntries].sort(
        (a, b) => b.date.localeCompare(a.date)
    );

    const userTags =
        getUserTags(
            entries,
            currentUser.id
        );

    const visitedPlaygrounds =
        getPlaygroundsWithEntries(
            userEntries,
            playgrounds
        );

    const entryCountsByDate =
        getEntryCountsByDate(userEntries);

    const visibleEntries =
        filterDiaryEntries(
            sortedEntries,
            filters
        );

    const totalPages =
        getTotalPages(
            visibleEntries.length
        );

    const pageEntries =
        paginate(
            visibleEntries,
            page
        );

    function updateFilters(next: typeof filters) {
        setPage(1);
        setFilters(next);
    }

    return (
        <Section title="Дневник">
            <ActionGroup>
                <Link to="/diary/create">
                    <Button variant="primary">
                        Записать тренировку
                    </Button>
                </Link>
            </ActionGroup>

            {/* Overview (UX §5) */}
            <p className="diary__subtitle">
                Твоя история тренировок
            </p>

            <DiaryStats
                entries={userEntries}
            />

            {
                userEntries.length === 0 ? (
                    /* Полностью пустой дневник — полноценный friendly empty state (UX §28) */
                    <div className="diary-empty-state">
                        <p className="diary-empty-state__title">
                            Твой дневник пока пуст
                        </p>

                        <p className="diary-empty-state__description">
                            Здесь будут сохраняться твои тренировки, площадки,
                            фотографии и история занятий.
                        </p>

                        <Link to="/diary/create">
                            <Button variant="primary">
                                Записать первую тренировку
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <hr />

                        {/* География тренировок (UX §6–10) */}
                        <h3>
                            География тренировок
                        </h3>

                        <DiaryMap
                            entries={userEntries}
                            playgrounds={playgrounds}
                            selectedPlaygroundId={filters.playgroundId}
                            onSelectPlayground={(playgroundId) =>
                                updateFilters({
                                    ...filters,
                                    playgroundId,
                                })
                            }
                        />

                        <hr />

                        {/* Календарь тренировок (UX §11–14) */}
                        <h3>
                            Календарь
                        </h3>

                        <WorkoutCalendar
                            entryCountsByDate={entryCountsByDate}
                            selectedDate={filters.date}
                            onSelectDate={(date) =>
                                updateFilters({
                                    ...filters,
                                    date,
                                })
                            }
                        />

                        <hr />

                        {/* Фильтры (UX §16–18, §34) */}
                        <h3>
                            Фильтры
                        </h3>

                        <div className="diary-filters">
                            <Select
                                label="Площадка"
                                emptyOptionLabel="Все площадки"
                                value={filters.playgroundId}
                                options={
                                    visitedPlaygrounds.map(
                                        (playground) => ({
                                            value: playground.id,
                                            label: playground.name,
                                        })
                                    )
                                }
                                onChange={(e) =>
                                    updateFilters({
                                        ...filters,
                                        playgroundId: e.target.value,
                                    })
                                }
                            />

                            <Input
                                label="Дата"
                                type="date"
                                className="input__field--date"
                                value={filters.date}
                                onChange={(e) =>
                                    updateFilters({
                                        ...filters,
                                        date: e.target.value,
                                    })
                                }
                            />

                            <div className="input">
                                <span className="input__label">
                                    Теги
                                </span>

                                <DiaryTagFilter
                                    tags={userTags}
                                    selectedTags={filters.tags}
                                    onChange={(tags) =>
                                        updateFilters({
                                            ...filters,
                                            tags,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* Активные фильтры (UX §19) */}
                        <DiaryActiveFilters
                            filters={filters}
                            playground={
                                filters.playgroundId
                                    ? getPlaygroundById(playgrounds, filters.playgroundId)
                                    : undefined
                            }
                            onChange={updateFilters}
                        />

                        <hr />

                        {/* Список тренировок (UX §20–27) */}
                        <div className="diary__list-header">
                            <h3>
                                Тренировки
                            </h3>

                            <p className="diary__count">
                                {
                                    hasActiveDiaryFilters(filters)
                                        ? `Показано ${visibleEntries.length} из ${userEntries.length}`
                                        : `${visibleEntries.length} ${
                                            pluralizeRu(
                                                visibleEntries.length,
                                                ["запись", "записи", "записей"]
                                            )
                                        }`
                                }
                            </p>
                        </div>

                        {
                            visibleEntries.length === 0 ? (
                                /* Пусто из-за фильтров — другой сценарий, не "дневник пуст" (UX §29) */
                                <div className="diary-empty-state">
                                    <p className="diary-empty-state__title">
                                        Ничего не найдено
                                    </p>

                                    <p className="diary-empty-state__description">
                                        Нет тренировок, соответствующих выбранным фильтрам.
                                    </p>

                                    <Button
                                        variant="outline"
                                        onClick={() => updateFilters(emptyDiaryFilters)}
                                    >
                                        Сбросить фильтры
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="workout-entries-list">
                                        {
                                            pageEntries.map(
                                                (entry) => (
                                                    <WorkoutEntryCard
                                                        key={entry.id}
                                                        entry={entry}
                                                        playground={
                                                            entry.playgroundId
                                                                ? getPlaygroundById(
                                                                    playgrounds,
                                                                    entry.playgroundId
                                                                )
                                                                : undefined
                                                        }
                                                    />
                                                )
                                            )
                                        }
                                    </div>

                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                    />
                                </>
                            )
                        }
                    </>
                )
            }
        </Section>
    );
}
