import Section from "../../components/ui/Section/Section";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";
import { Link } from "react-router-dom";

import { useState } from "react";

import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";
import TagBadge from "../../components/ui/TagBadge/TagBadge";

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

import {
    getUserTags,
    filterEntriesByTags,
} from "../../utils/workoutTags";

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

    const [selectedTags, setSelectedTags] =
        useState<string[]>([]);

    const userEntries =
        getUserWorkoutEntries(
            entries,
            currentUser.id
        );

    const userTags =
        getUserTags(
            entries,
            currentUser.id
        );

    const visibleEntries =
        filterEntriesByTags(
            userEntries,
            selectedTags
        );

    function toggleTag(tag: string) {
        setSelectedTags(
            (current) =>
                current.includes(tag)
                    ? current.filter(
                        (item) => item !== tag
                    )
                    : [...current, tag]
        );
    }

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
                userTags.length > 0 && (
                    <div className="tag-list">

                        {
                            userTags.map(
                                (tag) => (
                                    <TagBadge
                                        key={tag}
                                        label={tag}
                                        active={
                                            selectedTags.includes(tag)
                                        }
                                        onClick={() =>
                                            toggleTag(tag)
                                        }
                                    />
                                )
                            )
                        }

                        {
                            selectedTags.length > 0 && (
                                <TagBadge
                                    label="Сбросить фильтр"
                                    onClick={() =>
                                        setSelectedTags([])
                                    }
                                />
                            )
                        }

                    </div>
                )
            }

            {
                visibleEntries.length === 0 ? (
                    <p>
                        {
                            userEntries.length === 0
                                ? "Пока нет записей. Отметь свою первую тренировку."
                                : "Нет записей с выбранными тегами."
                        }
                    </p>
                ) : (
                    <div className="workout-entries-list">
                        {
                            visibleEntries.map(
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