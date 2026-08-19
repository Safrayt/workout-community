import { useWorkoutDiary } from "../../context/WorkoutDiaryContext";
import { useDiaryNotes } from "../../context/DiaryNotesContext";
import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useComments } from "../../context/CommentContext";
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
 */
export default function Home() {
    const { entries } = useWorkoutDiary();
    const { notes } = useDiaryNotes();
    const { playgrounds } = usePlaygrounds();
    const { comments } = useComments();
    const { subscriptions } = useSubscriptions();
    const { currentUser } = useCurrentUser();
    const { users } = useUserDirectory();

    const records = buildDiaryRecords(entries, notes);

    const followingIds = subscriptions
        .filter((subscription) => subscription.followerId === currentUser.id)
        .map((subscription) => subscription.followingId);

    return (
        <div className="home-page">
            <h1 className="home-page__title">Главная</h1>

            <HomeActivityMap
                records={records}
                playgrounds={playgrounds}
                users={users}
            />

            <HomeFeed
                records={records}
                users={users}
                playgrounds={playgrounds}
                comments={comments}
                followingIds={followingIds}
            />
        </div>
    );
}
