import { useState } from "react";

import "../../styles/components/workout-calendar.css";

import {
    getMonthMatrix,
    formatMonthTitle,
    formatDateKey,
} from "../../utils/calendar";

import { pluralizeRu } from "../../utils/pluralize";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type WorkoutCalendarProps = {

    /** Дата -> количество тренировок в этот день. */
    entryCountsByDate: Record<string, number>;

    /** Выбранная дата (YYYY-MM-DD) или "" — ничего не выбрано. */
    selectedDate: string;

    onSelectDate: (date: string) => void;

};

/**
 * Календарь тренировочных дней (UX-DIARY §11–14). Намеренно простой:
 * тренировочные дни выделяются точкой, количество за день — только
 * после выбора даты (не перегружаем каждую ячейку числом — §13).
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

    const selectedDayCount =
        selectedDate
            ? entryCountsByDate[selectedDate] ?? 0
            : 0;

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

                                    const hasEntries =
                                        Boolean(entryCountsByDate[dateKey]);

                                    const isSelected =
                                        dateKey === selectedDate;

                                    return (
                                        <button
                                            key={dayIndex}
                                            type="button"
                                            className={
                                                "workout-calendar__day" +
                                                (hasEntries ? " workout-calendar__day--active" : "") +
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
                                                hasEntries && (
                                                    <span
                                                        className="workout-calendar__day-dot"
                                                        aria-hidden="true"
                                                    />
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
                        {
                            selectedDayCount > 0
                                ? `${selectedDayCount} ${pluralizeRu(selectedDayCount, ["тренировка", "тренировки", "тренировок"])} в этот день`
                                : "В этот день тренировок не было"
                        }
                    </p>
                )
            }
        </div>
    );
}
