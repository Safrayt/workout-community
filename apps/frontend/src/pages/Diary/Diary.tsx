import Section from "../../components/ui/Section/Section";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";
import { Link } from "react-router-dom";

import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

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

export default function Diary() {
    const {
        entries,
    } = useWorkoutDiary();

    const {
        currentUser,
    } = useCurrentUser();

    const {
        playgrounds,
    } = usePlaygrounds();

    const userEntries =
        getUserWorkoutEntries(
            entries,
            currentUser.id
        );

    return (
        <Section title="Дневник тренировок">
            <ActionGroup>
                <Link to="/diary/create">
                    <Button variant="primary">
                        Записать тренировку
                    </Button>
                </Link>
            </ActionGroup>

            {
                userEntries.length === 0 ? (
                    <p>
                        Пока нет записей. Отметь свою первую тренировку.
                    </p>
                ) : (
                    <div className="workout-entries-list">
                        {
                            userEntries.map(
                                (entry) => (
                                    <WorkoutEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        playground={
                                            entry.playgroundId
                                                ? getPlaygroundById(
                                                    playgrounds,
                                                    entry.playgroundId
                                                )
                                                : undefined
                                        }
                                    />
                                )
                            )
                        }
                    </div>
                )
            }
        </Section>
    );
}