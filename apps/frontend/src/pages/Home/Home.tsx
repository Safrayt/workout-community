import { useEffect } from "react";

import { useWorkoutDiary } from "../../context/WorkoutDiaryContext";
import { useDiaryNotes } from "../../context/DiaryNotesContext";
import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useComments } from "../../context/CommentContext";
import { useEvents } from "../../context/EventContext";
import { useSubscriptions } from "../../context/SubscriptionContext";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useUserDirectory } from "../../hooks/useUserDirectory";

import { buildDiaryRecords } from "../../utils/diaryRecords";

import HomeActivityMap from "../../components/HomeActivityMap/HomeActivityMap";
import HomeFeed from "../../components/HomeFeed/HomeFeed";

import "../../styles/components/home.css";

/**
 * Главная страница портала (UX-HOME §36): карта недавней активности
 * сообщества сверху, социальная лента — основной контент под ней.
 * Личный дневник пользователя остаётся на /diary (§37 п.2) — здесь
 * показывается только публичная активность всего сообщества.
 *
 * Лента (HomeFeed) смешивает записи дневника (тренировки, заметки) с
 * системными оповещениями сообщества (создано мероприятие / новая
 * площадка) — но карта активности (HomeActivityMap) получает только
 * records (дневник): системные события на ней намеренно не
 * отображаются, карта отвечает на вопрос "где сообщество
 * тренировалось", а не "что вообще произошло".
 */
export default function Home() {
    const { entries, refreshEntries } = useWorkoutDiary();
    const { notes, refreshNotes } = useDiaryNotes();
    const { playgrounds } = usePlaygrounds();
    const { comments } = useComments();
    const { events } = useEvents();
    const { subscriptions } = useSubscriptions();
    const { currentUser } = useCurrentUser();
    const { users } = useUserDirectory();

    // entries/notes в контексте загружаются один раз при старте
    // SPA-сессии и сами по себе больше не перезапрашиваются (см.
    // комментарий у refreshEntry в WorkoutDiaryContext) — без этого
    // лента могла бы показывать устаревшие версии чужих записей (тот
    // же класс бага, что чинили на странице отдельной записи).
    // Перезапрашиваем оба списка каждый раз, когда открываете Главную.
    useEffect(() => {
        refreshEntries().catch((error: unknown) => {
            console.error("Не удалось обновить ленту (записи):", error);
        });
        refreshNotes().catch((error: unknown) => {
            console.error("Не удалось обновить ленту (заметки):", error);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const records = buildDiaryRecords(entries, notes);

    const followingIds = subscriptions
        .filter((subscription) => subscription.followerId === currentUser.id)
        .map((subscription) => subscription.followingId);

    return (
        <div className="home-page">
            <h1 className="home-page__title">Главная</h1>

            <HomeActivityMap
                playgrounds={playgrounds}
            />

            <HomeFeed
                records={records}
                users={users}
                playgrounds={playgrounds}
                comments={comments}
                events={events}
                followingIds={followingIds}
                isAdmin={currentUser.isAdmin}
            />
        </div>
    );
}
