import { useEffect, useMemo, useRef } from "react";

import "../../styles/components/profile-activity.css";

import { pluralizeRu } from "../../utils/pluralize";
import {
    buildYearActivity,
    type YearActivityDay,
} from "../../utils/yearActivity";

type ProfileActivityProps = {
    /** Даты тренировочных записей («ГГГГ-ММ-ДД»). */
    workoutDates: string[];

    /** Даты заметок дневника. */
    noteDates: string[];
};

const WEEKDAY_LABELS: { row: number; label: string }[] = [
    { row: 1, label: "Пн" },
    { row: 3, label: "Ср" },
    { row: 5, label: "Пт" },
];

const MONTH_NAMES_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
];

function formatDay(date: string): string {
    const [year, month, day] = date.split("-").map(Number);

    return `${day} ${MONTH_NAMES_GENITIVE[month - 1]} ${year}`;
}

function dayModifier(day: YearActivityDay): string {
    if (day.workouts > 0 && day.notes > 0) {
        return "profile-activity__day--both";
    }

    if (day.workouts > 0) {
        return "profile-activity__day--workout";
    }

    if (day.notes > 0) {
        return "profile-activity__day--note";
    }

    return "";
}

function dayTitle(day: YearActivityDay): string {
    const parts: string[] = [];

    if (day.workouts > 0) {
        parts.push(
            `${day.workouts} ${pluralizeRu(day.workouts, ["тренировка", "тренировки", "тренировок"])}`
        );
    }

    if (day.notes > 0) {
        parts.push(
            `${day.notes} ${pluralizeRu(day.notes, ["заметка", "заметки", "заметок"])}`
        );
    }

    return `${formatDay(day.date)}: ${parts.length > 0 ? parts.join(", ") : "нет записей"}`;
}

/**
 * Активность за последний год в стиле «contributions in the last year»
 * с GitHub. День — клетка: пустая (в дневнике ничего нет), зелёная
 * (есть тренировочная запись), оранжевая (есть заметка) или с градиентом
 * от зелёного к оранжевому (есть и то и другое). Количество записей за
 * день на цвет не влияет — оно в подсказке при наведении.
 *
 * Показывает то, что видно текущему пользователю: чужие закрытые записи
 * сюда не попадают (данные приходят из тех же списков, что и «Последние
 * записи»).
 */
export default function ProfileActivity({
    workoutDates,
    noteDates,
}: ProfileActivityProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const activity = useMemo(
        () => buildYearActivity(workoutDates, noteDates),
        [workoutDates, noteDates]
    );

    // На узком экране график шире окна — показываем его правый край
    // (последние недели), как на GitHub.
    useEffect(() => {
        const element = scrollRef.current;

        if (element) {
            element.scrollLeft = element.scrollWidth;
        }
    }, [activity.weeks.length]);

    const { totalWorkouts, totalNotes } = activity;

    const summary = `${totalWorkouts} ${pluralizeRu(totalWorkouts, ["тренировка", "тренировки", "тренировок"])} и ${totalNotes} ${pluralizeRu(totalNotes, ["заметка", "заметки", "заметок"])} за последний год`;

    return (
        <div className="profile-activity">
            <p className="profile-activity__summary">{summary}</p>

            <div className="profile-activity__scroll" ref={scrollRef}>
                <div
                    className="profile-activity__chart"
                    style={
                        {
                            "--weeks": activity.weeks.length,
                        } as React.CSSProperties
                    }
                >
                    <div className="profile-activity__months" aria-hidden="true">
                        {
                            activity.months.map((month) => (
                                <span
                                    key={`${month.label}-${month.column}`}
                                    className="profile-activity__month"
                                    style={{ gridColumn: month.column + 1 }}
                                >
                                    {month.label}
                                </span>
                            ))
                        }
                    </div>

                    <div className="profile-activity__weekdays" aria-hidden="true">
                        {
                            WEEKDAY_LABELS.map((weekday) => (
                                <span
                                    key={weekday.label}
                                    className="profile-activity__weekday"
                                    style={{ gridRow: weekday.row }}
                                >
                                    {weekday.label}
                                </span>
                            ))
                        }
                    </div>

                    <div
                        className="profile-activity__grid"
                        role="img"
                        aria-label={summary}
                    >
                        {
                            activity.weeks.flatMap((week, weekIndex) =>
                                week.map((day, dayIndex) =>
                                    day ? (
                                        <span
                                            key={day.date}
                                            className={`profile-activity__day ${dayModifier(day)}`.trim()}
                                            title={dayTitle(day)}
                                        />
                                    ) : (
                                        <span
                                            key={`empty-${weekIndex}-${dayIndex}`}
                                            className="profile-activity__day profile-activity__day--outside"
                                        />
                                    )
                                )
                            )
                        }
                    </div>
                </div>
            </div>

            <ul className="profile-activity__legend">
                <li>
                    <span className="profile-activity__day" /> Нет записей
                </li>
                <li>
                    <span className="profile-activity__day profile-activity__day--workout" />{" "}
                    Тренировка
                </li>
                <li>
                    <span className="profile-activity__day profile-activity__day--note" />{" "}
                    Заметка
                </li>
                <li>
                    <span className="profile-activity__day profile-activity__day--both" />{" "}
                    Тренировка и заметка
                </li>
            </ul>
        </div>
    );
}
