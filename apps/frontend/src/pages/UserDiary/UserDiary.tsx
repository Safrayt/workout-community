import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Pagination from "../../components/ui/Pagination/Pagination";

import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";
import DiaryNoteCard from "../../components/DiaryNoteCard/DiaryNoteCard";

import "../../styles/components/diary.css";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import {
    getUserWorkoutEntries,
} from "../../utils/workoutEntries";

import {
    buildDiaryRecords,
} from "../../utils/diaryRecords";

import { paginate, getTotalPages } from "../../utils/pagination";

/**
 * /u/:username/diary — дневник другого пользователя, только для
 * чтения. Без фильтров, карты и статистики, которые есть у
 * владельца в /diary — здесь нужна только сама лента записей.
 * Доступность страницы зависит от privacySettings.diaryVisible
 * просматриваемого пользователя.
 */
export default function UserDiary() {
    const { username } = useParams();

    const { currentUser } = useCurrentUser();
    const { getUserByUsername } = useUserDirectory();

    const { entries } = useWorkoutDiary();
    const { notes } = useDiaryNotes();

    const [page, setPage] = useState(1);

    const user = username
        ? getUserByUsername(username)
        : undefined;

    const isOwnProfile = user?.id === currentUser.id;

    if (!user) {
        return (
            <Section title="Дневник">
                <div className="profile-empty">
                    <p>
                        Пользователь @{username} не найден.
                    </p>
                </div>
            </Section>
        );
    }

    if (!isOwnProfile && !user.privacySettings.diaryVisible) {
        return (
            <Section title={`Дневник — ${user.nickname}`}>
                <div className="profile-empty">
                    <p>
                        Этот пользователь закрыл свой дневник от
                        посторонних.
                    </p>

                    <Link to={`/u/${user.nickname}`}>
                        <Button variant="secondary">
                            Назад к профилю
                        </Button>
                    </Link>
                </div>
            </Section>
        );
    }

    const userEntries = getUserWorkoutEntries(
        entries,
        user.id
    );

    const userNotes = notes.filter(
        (note) => note.userId === user.id
    );

    const allRecords = buildDiaryRecords(
        userEntries,
        userNotes
    );

    const totalPages = getTotalPages(allRecords.length);

    const pageRecords = paginate(allRecords, page);

    return (
        <Section title={`Дневник — ${user.nickname}`}>
            <Link
                to={`/u/${user.nickname}`}
                className="events-back-link"
            >
                ← Назад к профилю
            </Link>

            {
                allRecords.length === 0 ? (
                    <div className="profile-empty">
                        <p>
                            Дневник пока пуст.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="profile-diary-preview">
                            {
                                pageRecords.map((record) =>
                                    record.type === "workout" ? (
                                        <WorkoutEntryCard
                                            key={record.data.id}
                                            entry={record.data}
                                        />
                                    ) : (
                                        <DiaryNoteCard
                                            key={record.data.id}
                                            note={record.data}
                                        />
                                    )
                                )
                            }
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </>
                )
            }
        </Section>
    );
}
