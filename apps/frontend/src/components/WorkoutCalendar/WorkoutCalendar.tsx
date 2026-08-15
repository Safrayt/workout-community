import { useState } from "react";

import "../../styles/components/workout-calendar.css";

import {
    getMonthMatrix,
    formatMonthTitle,
    formatDateKey,
} from "../../utils/calendar";

import { pluralizeRu } from "../../utils/pluralize";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type DayCounts = {
    workout: number;
    note: number;
};

type WorkoutCalendarProps = {

    /** Дата -> количество записей каждого типа в этот день. */
    entryCountsByDate: Record<string, DayCounts>;

    /** Выбранная дата (YYYY-MM-DD) или "" — ничего не выбрано. */
    selectedDate: string;

    onSelectDate: (date: string) => void;

};

/**
 * Календарь дневника (UX-DIARY §11–14; UX-DIARY-V2 §10). Учитывает
 * оба типа записей — тренировки и заметки, с разными по цвету
 * точками, чтобы различие было видно на уровне календаря, не только
 * списка. Число за день — только после выбора даты (§13).
 */
export default function WorkoutCalendar({
    entryCountsByDate,
    selectedDate,
    onSelectDate,
}: WorkoutCalendarProps) {
    const today = new Date();

    const [viewYear, setViewYear] =
        useState(today.getFullYear());

    const [viewMonth, setViewMonth] =
        useState(today.getMonth());

    const weeks = getMonthMatrix(viewYear, viewMonth);

    function goToPreviousMonth() {
        if (viewMonth === 0) {
            setViewYear((year) => year - 1);
            setViewMonth(11);
        } else {
            setViewMonth((month) => month - 1);
        }
    }

    function goToNextMonth() {
        if (viewMonth === 11) {
            setViewYear((year) => year + 1);
            setViewMonth(0);
        } else {
            setViewMonth((month) => month + 1);
        }
    }

    const selectedDayCounts =
        selectedDate
            ? entryCountsByDate[selectedDate]
            : undefined;

    function describeSelectedDay(counts?: DayCounts) {
        if (!counts || (counts.workout === 0 && counts.note === 0)) {
            return "В этот день записей не было";
        }

        const parts: string[] = [];

        if (counts.workout > 0) {
            parts.push(
                `${counts.workout} ${pluralizeRu(counts.workout, ["тренировка", "тренировки", "тренировок"])}`
            );
        }

        if (counts.note > 0) {
            parts.push(
                `${counts.note} ${pluralizeRu(counts.note, ["заметка", "заметки", "заметок"])}`
            );
        }

        return `${parts.join(", ")} в этот день`;
    }

    return (
        <div className="workout-calendar">
            <div className="workout-calendar__header">
                <button
                    type="button"
                    className="workout-calendar__nav"
                    aria-label="Предыдущий месяц"
                    onClick={goToPreviousMonth}
                >
                    ←
                </button>

                <p className="workout-calendar__title">
                    {formatMonthTitle(viewYear, viewMonth)}
                </p>

                <button
                    type="button"
                    className="workout-calendar__nav"
                    aria-label="Следующий месяц"
                    onClick={goToNextMonth}
                >
                    →
                </button>
            </div>

            <div className="workout-calendar__weekdays">
                {
                    WEEKDAY_LABELS.map((label) => (
                        <span key={label}>
                            {label}
                        </span>
                    ))
                }
            </div>

            <div className="workout-calendar__grid">
                {
                    weeks.map((week, weekIndex) => (
                        <div
                            key={weekIndex}
                            className="workout-calendar__week"
                        >
                            {
                                week.map((day, dayIndex) => {
                                    if (day === null) {
                                        return (
                                            <span
                                                key={dayIndex}
                                                className="workout-calendar__day workout-calendar__day--empty"
                                            />
                                        );
                                    }

                                    const dateKey = formatDateKey(
                                        viewYear,
                                        viewMonth,
                                        day
                                    );

                                    const dayCounts =
                                        entryCountsByDate[dateKey];

                                    const hasWorkouts =
                                        Boolean(dayCounts?.workout);

                                    const hasNotes =
                                        Boolean(dayCounts?.note);

                                    const isSelected =
                                        dateKey === selectedDate;

                                    return (
                                        <button
                                            key={dayIndex}
                                            type="button"
                                            className={
                                                "workout-calendar__day" +
                                                ((hasWorkouts || hasNotes) ? " workout-calendar__day--active" : "") +
                                                (isSelected ? " workout-calendar__day--selected" : "")
                                            }
                                            onClick={() =>
                                                onSelectDate(
                                                    isSelected ? "" : dateKey
                                                )
                                            }
                                        >
                                            <span className="workout-calendar__day-number">
                                                {day}
                                            </span>

                                            {
                                                (hasWorkouts || hasNotes) && (
                                                    <span
                                                        className="workout-calendar__day-dots"
                                                        aria-hidden="true"
                                                    >
                                                        {
                                                            hasWorkouts && (
                                                                <span className="workout-calendar__day-dot workout-calendar__day-dot--workout" />
                                                            )
                                                        }

                                                        {
                                                            hasNotes && (
                                                                <span className="workout-calendar__day-dot workout-calendar__day-dot--note" />
                                                            )
                                                        }
                                                    </span>
                                                )
                                            }
                                        </button>
                                    );
                                })
                            }
                        </div>
                    ))
                }
            </div>

            {
                selectedDate && (
                    <p className="workout-calendar__selected-info">
                        {describeSelectedDay(selectedDayCounts)}
                    </p>
                )
            }
        </div>
    );
}
