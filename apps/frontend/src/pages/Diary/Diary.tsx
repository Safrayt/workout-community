import { Link } from "react-router-dom";

import { useState } from "react";

import Section from "../../components/ui/Section/Section";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";
import Input from "../../components/ui/Input/Input";
import Pagination from "../../components/ui/Pagination/Pagination";
import CollapsibleSection from "../../components/ui/CollapsibleSection/CollapsibleSection";

import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";
import DiaryNoteCard from "../../components/DiaryNoteCard/DiaryNoteCard";
import DiaryStats from "../../components/DiaryStats/DiaryStats";
import DiaryMap from "../../components/DiaryMap/DiaryMap";
import WorkoutCalendar from "../../components/WorkoutCalendar/WorkoutCalendar";
import DiaryTagFilter from "../../components/DiaryTagFilter/DiaryTagFilter";
import DiaryActiveFilters from "../../components/DiaryActiveFilters/DiaryActiveFilters";

import "../../styles/components/diary.css";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

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
    usePersonalTags,
} from "../../context/PersonalTagsContext";

import {
    emptyDiaryFilters,
} from "../../types/diaryFilters";

import {
    buildDiaryRecords,
} from "../../utils/diaryRecords";

import {
    filterDiaryRecords,
    hasActiveDiaryFilters,
    getEntryCountsByDate,
    getPlaygroundsWithEntries,
} from "../../utils/diaryFilters";

import { getYearsWithEntries } from "../../utils/diaryDateFilter";

import {
    paginate,
    getTotalPages,
} from "../../utils/pagination";

import { pluralizeRu } from "../../utils/pluralize";

const RECORD_TYPE_OPTIONS = [
    { value: "workout", label: "Тренировки" },
    { value: "note", label: "Заметки" },
];

export default function Diary() {
    const {
        entries,
    } = useWorkoutDiary();

    const {
        notes,
    } = useDiaryNotes();

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

    const userNotes =
        notes.filter(
            (note) => note.userId === currentUser.id
        );

    // Единая хронологическая лента: тренировки и заметки — это два
    // типа одной сущности "Запись дневника" (UX-DIARY-V2 §2, §8).
    // Новые записи сверху (UX §27).
    const allRecords =
        buildDiaryRecords(
            userEntries,
            userNotes
        );

    const hasAnyRecords =
        allRecords.length > 0;

    const {
        tags: personalTags,
    } = usePersonalTags();

    const userTags =
        personalTags
            .filter((tag) => tag.userId === currentUser.id)
            .map((tag) => tag.name)
            .sort((a, b) => a.localeCompare(b, "ru"));

    const visitedPlaygrounds =
        getPlaygroundsWithEntries(
            allRecords,
            playgrounds
        );

    const availableYears =
        getYearsWithEntries(allRecords);

    const entryCountsByDate =
        getEntryCountsByDate(allRecords);

    const visibleRecords =
        filterDiaryRecords(
            allRecords,
            filters
        );

    const totalPages =
        getTotalPages(
            visibleRecords.length
        );

    const pageRecords =
        paginate(
            visibleRecords,
            page
        );

    function updateFilters(next: typeof filters) {
        setPage(1);
        setFilters(next);
    }

    return (
        <Section title="Дневник">

            {/* Header (UX §4; UX-DIARY-V2 §4 — единая точка входа) */}
            <ActionGroup>
                <Link to="/diary/create">
                    <Button variant="primary">
                        Добавить запись
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
                !hasAnyRecords ? (
                    /* Полностью пустой дневник — полноценный friendly empty state (UX §28) */
                    <div className="diary-empty-state">
                        <p className="diary-empty-state__title">
                            Твой дневник пока пуст
                        </p>

                        <p className="diary-empty-state__description">
                            Здесь будут сохраняться твои тренировки, заметки,
                            площадки, фотографии и история занятий.
                        </p>

                        <Link to="/diary/create">
                            <Button variant="primary">
                                Добавить первую запись
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <hr />

                        {/* География тренировок (UX §6–10; UX-DIARY-V2 §11) */}
                        <CollapsibleSection title="География">
                            <DiaryMap
                                records={allRecords}
                                playgrounds={playgrounds}
                                selectedPlaygroundId={filters.playgroundId}
                                onSelectPlayground={(playgroundId) =>
                                    updateFilters({
                                        ...filters,
                                        playgroundId,
                                    })
                                }
                            />
                        </CollapsibleSection>

                        {/* Календарь (UX §11–14; UX-DIARY-V2 §10) */}
                        <CollapsibleSection title="Календарь">
                            <WorkoutCalendar
                                entryCountsByDate={entryCountsByDate}
                                selectedDate={
                                    filters.datePrecision === "day"
                                        ? filters.date
                                        : ""
                                }
                                onSelectDate={(date) =>
                                    updateFilters({
                                        ...filters,
                                        date,
                                        datePrecision: "day",
                                    })
                                }
                            />
                        </CollapsibleSection>

                        {/* Фильтры (UX §16–18, §34; UX-DIARY-V2 §12) */}
                        <CollapsibleSection title="Фильтры">
                            <div className="diary-filters">
                            <Select
                                label="Тип записи"
                                emptyOptionLabel="Все записи"
                                value={
                                    filters.recordType === "all"
                                        ? ""
                                        : filters.recordType
                                }
                                options={RECORD_TYPE_OPTIONS}
                                onChange={(e) =>
                                    updateFilters({
                                        ...filters,
                                        recordType:
                                            (e.target.value || "all") as typeof filters.recordType,
                                    })
                                }
                            />

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

                            <div className="diary-date-filter">
                                <Select
                                    label="Дата"
                                    value={filters.datePrecision}
                                    options={[
                                        { value: "day", label: "День" },
                                        { value: "month", label: "Месяц" },
                                        { value: "year", label: "Год" },
                                    ]}
                                    onChange={(e) =>
                                        updateFilters({
                                            ...filters,
                                            datePrecision:
                                                e.target.value as typeof filters.datePrecision,
                                            // При смене точности прошлое значение
                                            // теряет смысл (день "15" — не месяц).
                                            date: "",
                                        })
                                    }
                                />

                                {
                                    filters.datePrecision === "day" && (
                                        <Input
                                            label="Число"
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
                                    )
                                }

                                {
                                    filters.datePrecision === "month" && (
                                        <Input
                                            label="Месяц"
                                            type="month"
                                            className="input__field--date"
                                            value={filters.date}
                                            onChange={(e) =>
                                                updateFilters({
                                                    ...filters,
                                                    date: e.target.value,
                                                })
                                            }
                                        />
                                    )
                                }

                                {
                                    filters.datePrecision === "year" && (
                                        <Select
                                            label="Год"
                                            emptyOptionLabel="Выберите год"
                                            value={filters.date}
                                            options={
                                                availableYears.map(
                                                    (year) => ({
                                                        value: year,
                                                        label: year,
                                                    })
                                                )
                                            }
                                            onChange={(e) =>
                                                updateFilters({
                                                    ...filters,
                                                    date: e.target.value,
                                                })
                                            }
                                        />
                                    )
                                }
                            </div>

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
                        </CollapsibleSection>

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

                        {/* Лента записей (UX §20–27; UX-DIARY-V2 §8, §9) */}
                        <div className="diary__list-header">
                            <h3>Записи</h3>

                            <p className="diary__count">
                                {
                                    hasActiveDiaryFilters(filters)
                                        ? `Показано ${visibleRecords.length} из ${allRecords.length}`
                                        : `${visibleRecords.length} ${
                                            pluralizeRu(
                                                visibleRecords.length,
                                                ["запись", "записи", "записей"]
                                            )
                                        }`
                                }
                            </p>
                        </div>

                        {
                            visibleRecords.length === 0 ? (
                                /* Пусто из-за фильтров — другой сценарий, не "дневник пуст" (UX §29) */
                                <div className="diary-empty-state">
                                    <p className="diary-empty-state__title">
                                        Ничего не найдено
                                    </p>

                                    <p className="diary-empty-state__description">
                                        Нет записей, соответствующих выбранным фильтрам.
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
                                            pageRecords.map(
                                                (record) => {
                                                    const playground =
                                                        record.data.playgroundId
                                                            ? getPlaygroundById(
                                                                playgrounds,
                                                                record.data.playgroundId
                                                            )
                                                            : undefined;

                                                    return record.type === "workout" ? (
                                                        <WorkoutEntryCard
                                                            key={record.data.id}
                                                            entry={record.data}
                                                            playground={playground}
                                                        />
                                                    ) : (
                                                        <DiaryNoteCard
                                                            key={record.data.id}
                                                            note={record.data}
                                                            playground={playground}
                                                        />
                                                    );
                                                }
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
