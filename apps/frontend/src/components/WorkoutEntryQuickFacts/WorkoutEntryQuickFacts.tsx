import "../../styles/components/workout-entry-quick-facts.css";

import type {
    WorkoutEntry,
} from "../../types/workoutEntry";

import { formatWorkoutEntryDateLong } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";

type Props = {

    entry: WorkoutEntry;

};

/**
 * Краткие структурированные факты о записи (UX-DIARY-ENTRY §10).
 *
 * В отличие от EventQuickFacts здесь нет фиксированного набора
 * полей с "—" вместо отсутствующих данных: этот блок не должен
 * превращаться в статистическую панель, поэтому показываются
 * только реально существующие сведения (дата всегда, время суток
 * — если есть). Площадка здесь не дублируется — она уже показана
 * отдельным блоком Playground Preview ниже.
 */
export default function WorkoutEntryQuickFacts({
    entry,
}: Props) {

    return (

        <ul className="workout-entry-quick-facts">

            <li className="workout-entry-quick-facts__item">
                <span className="workout-entry-quick-facts__label">
                    Дата
                </span>

                <span className="workout-entry-quick-facts__value">
                    {formatWorkoutEntryDateLong(entry.date)}
                </span>
            </li>

            {
                entry.timeOfDay && (
                    <li className="workout-entry-quick-facts__item">
                        <span className="workout-entry-quick-facts__label">
                            Время суток
                        </span>

                        <span className="workout-entry-quick-facts__value">
                            {getTimeOfDayName(entry.timeOfDay)}
                        </span>
                    </li>
                )
            }

        </ul>

    );

}
