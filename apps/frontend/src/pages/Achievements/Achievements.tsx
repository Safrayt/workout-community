import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";
import Button from "../../components/ui/Button/Button";

import AchievementCard from "../../components/AchievementCard/AchievementCard";

import "../../styles/components/achievements-grid.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import { useAchievementsProgress } from "../../hooks/useAchievementsProgress";

/**
 * Обслуживает /achievements (свои достижения) и
 * /u/:username/achievements (достижения любого пользователя, если
 * он не закрыл их в настройках приватности).
 */
export default function Achievements() {

    const { username } = useParams();

    const {
        currentUser,
    } = useCurrentUser();

    const { getUserByUsername } = useUserDirectory();

    const user = username
        ? getUserByUsername(username)
        : currentUser;

    const isOwnProfile = user?.id === currentUser.id;

    // Прогресс считает сервер (записи дневника, площадки, регистрации).
    // Хук стоит до ранних return ниже; запрос идёт, только если
    // достижения можно показывать.
    const canViewAchievements =
        isOwnProfile || Boolean(user?.privacySettings.achievementsVisible);

    const {
        progress: achievementsProgress,
        error: achievementsError,
    } = useAchievementsProgress(user?.id, canViewAchievements);

    if (!user) {
        return (
            <Section title="Достижения">
                <div className="profile-empty">
                    <p>
                        Пользователь @{username} не найден.
                    </p>
                </div>
            </Section>
        );
    }

    if (!isOwnProfile && !user.privacySettings.achievementsVisible) {
        return (
            <Section title={`Достижения — ${user.nickname}`}>
                <div className="profile-empty">
                    <p>
                        Этот пользователь закрыл свои достижения от
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

    if (achievementsError) {
        return (
            <Section title={isOwnProfile ? "Достижения" : `Достижения — ${user.nickname}`}>
                <div className="profile-empty">
                    <p>
                        {achievementsError}
                    </p>
                </div>
            </Section>
        );
    }

    if (!achievementsProgress) {
        return (
            <Section title={isOwnProfile ? "Достижения" : `Достижения — ${user.nickname}`}>
                <div className="profile-empty">
                    <p>
                        Загружаю достижения…
                    </p>
                </div>
            </Section>
        );
    }

    const unlocked =
        achievementsProgress.filter(
            (item) => item.unlocked
        );

    const locked =
        achievementsProgress.filter(
            (item) => !item.unlocked
        );

    return (

        <Section title={isOwnProfile ? "Достижения" : `Достижения — ${user.nickname}`}>

            {
                !isOwnProfile && (
                    <Link
                        to={`/u/${user.nickname}`}
                        className="events-back-link"
                    >
                        ← Назад к профилю
                    </Link>
                )
            }

            <InfoSection title="Общий прогресс">

                <p>

                    Открыто

                    {" "}

                    {unlocked.length}

                    {" из "}

                    {achievementsProgress.length}

                </p>

            </InfoSection>

            <InfoSection title="Полученные">

                {
                    unlocked.length === 0
                        ? (
                            <p>
                                Пока нет достижений.
                            </p>
                        )
                        : (
                            <ul className="achievements-grid">

                                {
                                    unlocked.map(
                                        (item) => (

                                            <AchievementCard

                                                key={
                                                    item.achievement.id
                                                }

                                                achievement={
                                                    item.achievement
                                                }

                                            />

                                        )
                                    )
                                }

                            </ul>
                        )
                }

            </InfoSection>

            <InfoSection title="Ещё не открыты">

                {
                    locked.length === 0
                        ? (
                            <p>
                                Все достижения открыты!
                            </p>
                        )
                        : (
                            <ul className="achievements-grid">

                                {
                                    locked.map(
                                        (item) => (

                                            <AchievementCard

                                                key={
                                                    item.achievement.id
                                                }

                                                achievement={
                                                    item.achievement
                                                }

                                            />

                                        )
                                    )
                                }

                            </ul>
                        )
                }

            </InfoSection>

        </Section>

    );

}
