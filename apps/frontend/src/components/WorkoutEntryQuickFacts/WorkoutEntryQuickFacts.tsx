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
 * — если есть, температура воздуха — если есть). Площадка здесь не
 * дублируется — она уже показана отдельным блоком Playground Preview
 * ниже.
 */
/** Температура целым числом, как у погоды события: «12°C», «-3°C». */
function formatTemperature(temperature: number): string {
    return `${Math.round(temperature)}°C`;
}

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

            {
                entry.temperatureC !== undefined && (
                    <li className="workout-entry-quick-facts__item">
                        <span className="workout-entry-quick-facts__label">
                            Температура воздуха
                        </span>

                        <span className="workout-entry-quick-facts__value">
                            {formatTemperature(entry.temperatureC)}
                        </span>

                        {/* Данные MET Norway распространяются под CC BY 4.0 —
                            ссылка на источник обязательна (как и у погоды
                            события). Значение приблизительное: температура
                            на площадке в момент создания записи. */}
                        <span className="workout-entry-quick-facts__source">
                            {"Данные: "}
                            <a
                                href="https://www.met.no/en"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                MET Norway
                            </a>
                        </span>
                    </li>
                )
            }

        </ul>

    );

}
