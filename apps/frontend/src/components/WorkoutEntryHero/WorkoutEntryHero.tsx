import "../../styles/components/workout-entry-hero.css";

import type {
    WorkoutEntry,
} from "../../types/workoutEntry";

import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";

type Props = {

    entry: WorkoutEntry;

};

/**
 * Верхний блок страницы записи дневника (UX-DIARY-ENTRY §7–9;
 * UX-DIARY-V2 §16 — тип записи в общей информации).
 *
 * В отличие от EventHero здесь нет статуса и главного CTA —
 * запись дневника не совершает действие, она рассказывает
 * историю. Задача Hero — показать заголовок записи. Дата и время
 * суток не дублируются здесь: они уже показаны в Quick Facts.
 */
export default function WorkoutEntryHero({
    entry,
}: Props) {

    return (

        <header className="workout-entry-hero">

            <DiaryRecordTypeBadge type="workout" />

            <h1 className="workout-entry-hero__title">
                {entry.title}
            </h1>

        </header>

    );

}
