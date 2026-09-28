import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import WorkoutEntryNotFound from "../../components/WorkoutEntryNotFound/WorkoutEntryNotFound";

import { getDiaryNote, getWorkoutEntry } from "../../api/diary";

import { useUserDirectoryContext } from "../../context/UserDirectoryContext";

import { getDiaryNotePath, getWorkoutEntryPath } from "../../utils/diaryPaths";

type Props = {
    kind: "workout" | "note";
};

/**
 * Старые адреса записей — /diary/:id и /diary/notes/:id — теперь
 * только перекидывают на канонический /u/<ник автора>/diary/... (см.
 * utils/diaryPaths.ts). Оставлены, чтобы не сломать уже разосланные
 * ссылки и старые уведомления, у которых target_url хранится в
 * прежнем виде.
 *
 * Автора записи узнаём отдельным запросом к API, а не из общего
 * списка в контексте: тот загружается один раз за сессию и может не
 * содержать запись, на которую только что перешли по чужой ссылке.
 */
export default function LegacyDiaryRedirect({ kind }: Props) {
    const { id } = useParams();

    const { getUserById, isLoading: isDirectoryLoading } =
        useUserDirectoryContext();

    const [authorId, setAuthorId] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) {
            setNotFound(true);
            return;
        }

        const request =
            kind === "workout" ? getWorkoutEntry(id) : getDiaryNote(id);

        request
            .then((record) => setAuthorId(record.userId))
            .catch((error: unknown) => {
                console.error("Не удалось открыть запись дневника:", error);
                setNotFound(true);
            });
    }, [id, kind]);

    if (notFound || !id) {
        return <WorkoutEntryNotFound />;
    }

    if (authorId === null || isDirectoryLoading) {
        return <p>Загрузка…</p>;
    }

    const author = getUserById(authorId);

    if (!author) {
        return <WorkoutEntryNotFound />;
    }

    return (
        <Navigate
            to={
                kind === "workout"
                    ? getWorkoutEntryPath(author.nickname, id)
                    : getDiaryNotePath(author.nickname, id)
            }
            replace
        />
    );
}
