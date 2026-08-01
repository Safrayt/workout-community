import type { WorkoutEntry } from "../../types/workoutEntry";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";

import "../../styles/components/workout-entry-card.css";

type WorkoutEntryCardProps = {
    entry: WorkoutEntry;
    playground?: Playground;
};

export default function WorkoutEntryCard({
    entry,
    playground,
}: WorkoutEntryCardProps) {
    return (
        <div className="workout-entry-card">
            <h4>{entry.title}</h4>

            <p>
                {formatWorkoutEntryDate(entry.date)}
                {
                    entry.timeOfDay &&
                        ` • ${getTimeOfDayName(entry.timeOfDay)}`
                }
            </p>

            {
                playground && (
                    <p>
                        Площадка: {playground.name}
                    </p>
                )
            }

            {
                entry.description && (
                    <p>{entry.description}</p>
                )
            }
        </div>
    );
}