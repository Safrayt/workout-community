import { Link } from "react-router-dom";

import type { WorkoutEntry } from "../../types/workoutEntry";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";
import { getDescriptionPreview } from "../../utils/workoutEntryDescription";

import TagBadge from "../ui/TagBadge/TagBadge";
import Button from "../ui/Button/Button";

import "../../styles/components/workout-entry-card.css";
import "../../styles/components/workout-entry-description.css";

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
                    <p className="workout-entry-description__text">
                        {getDescriptionPreview(entry.description)}
                    </p>
                )
            }

            {
                entry.tags && entry.tags.length > 0 && (
                    <div className="tag-list">
                        {
                            entry.tags.map(
                                (tag) => (
                                    <TagBadge
                                        key={tag}
                                        label={tag}
                                    />
                                )
                            )
                        }
                    </div>
                )
            }

            <Link to={`/diary/${entry.id}`}>
                <Button variant="secondary">
                    Подробнее
                </Button>
            </Link>
        </div>
    );
}