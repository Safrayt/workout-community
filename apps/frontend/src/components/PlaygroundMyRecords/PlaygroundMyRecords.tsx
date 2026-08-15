import { Link } from "react-router-dom";

import type { WorkoutEntry } from "../../types/workoutEntry";
import type { DiaryNote } from "../../types/diaryNote";

import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";

import { getRecordsForPlayground } from "../../utils/diaryFilters";
import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";

import "../../styles/components/playground-my-records.css";

type Props = {

    playgroundId: string;

    userId: string;

    entries: WorkoutEntry[];

    notes: DiaryNote[];

};

/**
 * "Мои записи" (UX-DIARY-V2 §14) — личная история пользователя на
 * этой площадке, в отличие от PlaygroundActivity/AllTimeActivity,
 * которые показывают агрегированную активность всего сообщества.
 * Если у пользователя нет своих записей здесь — блок просто не
 * рендерится, отдельный empty state не нужен (это не основной
 * контент страницы площадки).
 */
export default function PlaygroundMyRecords({
    playgroundId,
    userId,
    entries,
    notes,
}: Props) {
    const records = getRecordsForPlayground(
        entries,
        notes,
        userId,
        playgroundId
    );

    if (records.length === 0) {
        return null;
    }

    return (
        <section className="playground-my-records">
            <h3 className="playground-my-records__title">
                Мои записи
            </h3>

            <ul className="playground-my-records__list">
                {
                    records.map((record) => (
                        <li
                            key={record.data.id}
                            className="playground-my-records__item"
                        >
                            <Link
                                to={
                                    record.type === "workout"
                                        ? `/diary/${record.data.id}`
                                        : `/diary/notes/${record.data.id}`
                                }
                                className="playground-my-records__link"
                            >
                                <DiaryRecordTypeBadge type={record.type} />

                                <span className="playground-my-records__date">
                                    {formatWorkoutEntryDate(record.date)}
                                </span>

                                <span className="playground-my-records__heading">
                                    {
                                        record.type === "workout"
                                            ? record.data.title
                                            : record.data.title ?? "Заметка"
                                    }
                                </span>
                            </Link>
                        </li>
                    ))
                }
            </ul>
        </section>
    );
}
