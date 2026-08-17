import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import ProfileHeader from "../../components/ProfileHeader/ProfileHeader";
import ProfileStats from "../../components/ProfileStats/ProfileStats";
import AchievementCard from "../../components/AchievementCard/AchievementCard";
import WorkoutEntryCard from "../../components/WorkoutEntryCard/WorkoutEntryCard";
import DiaryNoteCard from "../../components/DiaryNoteCard/DiaryNoteCard";
import EventSummary from "../../components/EventSummary/EventSummary";
import SubscriptionsList from "../../components/SubscriptionsList/SubscriptionsList";

import "../../styles/components/profile.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    usePersonalTags,
} from "../../context/PersonalTagsContext";

import {
    useSubscriptions,
} from "../../context/SubscriptionContext";

import {
    getUserWorkoutEntries,
} from "../../utils/workoutEntries";

import {
    getCreatedEvents,
} from "../../utils/events";

import {
    getVisitedPlaygroundsCount,
} from "../../utils/playgrounds";

import {
    getAchievementsProgress,
} from "../../utils/achievements";

import {
    buildDiaryRecords,
} from "../../utils/diaryRecords";

import {
    getFollowingIds,
} from "../../utils/subscriptions";

import { PROFILE_PREVIEW_LIMIT, SUBSCRIPTIONS_PREVIEW_LIMIT } from "../../constants/user";
import { MAX_PERSONAL_TAGS } from "../../constants/personalTags";

/**
 * Профиль — карточка участника сообщества, идентифицированного
 * username, а не анкета человека с реальными данными
 * (UX-PROFILE §1, §49). Поэтому имя, фамилия, город, уровень и
 * XP намеренно не показываются на этом экране (UX-PROFILE §44).
 *
 * Обслуживает два маршрута:
 * - /profile — всегда собственный профиль текущего пользователя;
 * - /u/:username — публичный профиль любого пользователя
 *   (UX-PROFILE §4, §29, §30). Если открыт свой же username,
 *   ведёт себя как собственный профиль (виден блок "Настройки" и
 *   т.д.) — отдельный редирект не нужен.
 */
export default function Profile() {
    const { username } = useParams();

    const {
        currentUser,
    } = useCurrentUser();

    const { getUserByUsername } = useUserDirectory();

    const user = username
        ? getUserByUsername(username)
        : currentUser;

    const isOwnProfile = user?.id === currentUser.id;

    const canViewDiary =
        isOwnProfile ||
        Boolean(user?.privacySettings.diaryVisible);

    const canViewAchievements =
        isOwnProfile ||
        Boolean(user?.privacySettings.achievementsVisible);

    const canViewSubscriptions =
        isOwnProfile ||
        Boolean(user?.privacySettings.subscriptionsVisible);

    const {
        entries,
    } = useWorkoutDiary();

    const {
        notes,
    } = useDiaryNotes();

    const {
        events,
    } = useEvents();

    const {
        registrations,
    } = useRegistration();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        tags,
    } = usePersonalTags();

    const {
        subscriptions,
    } = useSubscriptions();

    if (!user) {
        return (
            <Section title="Профиль">
                <div className="profile-empty">
                    <p>
                        Пользователь @{username} не найден.
                    </p>

                    <Link to="/">
                        <Button variant="secondary">
                            На главную
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

    const diaryRecords = buildDiaryRecords(
        userEntries,
        userNotes
    );

    const createdEvents = getCreatedEvents(
        events,
        user.id
    );

    const visitedPlaygroundsCount = getVisitedPlaygroundsCount(
        [
            ...userEntries.map((entry) => entry.playgroundId),
            ...userNotes.map((note) => note.playgroundId),
        ]
    );

    const achievementsProgress = getAchievementsProgress(
        user.id,
        events,
        playgrounds,
        registrations
    );

    const unlockedAchievements = achievementsProgress.filter(
        (item) => item.unlocked
    );

    const userTagsCount = tags.filter(
        (tag) => tag.userId === user.id
    ).length;

    const followingIds = getFollowingIds(
        subscriptions,
        user.id
    );

    const statsItems = [
        {
            key: "workouts",
            value: userEntries.length,
            label: "Тренировок",
        },
        {
            key: "playgrounds",
            value: visitedPlaygroundsCount,
            label: "Площадок",
        },
        {
            key: "events",
            value: createdEvents.length,
            label: "Событий",
        },
        {
            key: "achievements",
            value: unlockedAchievements.length,
            label: "Достижений",
        },
    ];

    return (
        <Section title="Профиль">
            <ProfileHeader
                userId={user.id}
                username={user.nickname}
                avatarUrl={user.avatarUrl}
                about={user.bio}
                createdAt={user.createdAt}
                isOwnProfile={isOwnProfile}
            />

            <ProfileStats items={statsItems} />

            <InfoSection
                title="Последние записи"
                className="profile-section"
            >
                {
                    !canViewDiary ? (
                        <div className="profile-empty">
                            <p>
                                Пользователь закрыл свой дневник от посторонних.
                            </p>
                        </div>
                    ) : diaryRecords.length === 0 ? (
                        <div className="profile-empty">
                            <p>
                                {
                                    isOwnProfile
                                        ? "Твой дневник пока пуст."
                                        : "У пользователя ещё нет тренировочных записей."
                                }
                            </p>

                            {
                                isOwnProfile && (
                                    <Link to="/diary/create">
                                        <Button variant="secondary">
                                            Записать тренировку
                                        </Button>
                                    </Link>
                                )
                            }
                        </div>
                    ) : (
                        <>
                            <div className="profile-diary-preview">
                                {
                                    diaryRecords
                                        .slice(0, PROFILE_PREVIEW_LIMIT)
                                        .map((record) =>
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

                            <ActionGroup>
                                <Link to={isOwnProfile ? "/diary" : `/u/${user.nickname}/diary`}>
                                    <Button variant="secondary">
                                        Смотреть дневник
                                    </Button>
                                </Link>
                            </ActionGroup>
                        </>
                    )
                }
            </InfoSection>

            <InfoSection
                title="Достижения"
                className="profile-section"
            >
                {
                    !canViewAchievements ? (
                        <div className="profile-empty">
                            <p>
                                Пользователь закрыл свои достижения от посторонних.
                            </p>
                        </div>
                    ) : unlockedAchievements.length === 0 ? (
                        <div className="profile-empty">
                            <p>
                                {
                                    isOwnProfile
                                        ? "Продолжайте тренироваться, чтобы получать новые достижения."
                                        : "Достижений пока нет."
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <ul className="profile-achievements-preview">
                                {
                                    unlockedAchievements
                                        .slice(0, PROFILE_PREVIEW_LIMIT)
                                        .map((item) => (
                                            <AchievementCard
                                                key={item.achievement.id}
                                                achievement={item.achievement}
                                            />
                                        ))
                                }
                            </ul>

                            <ActionGroup>
                                <Link to={isOwnProfile ? "/achievements" : `/u/${user.nickname}/achievements`}>
                                    <Button variant="secondary">
                                        Все достижения
                                    </Button>
                                </Link>
                            </ActionGroup>
                        </>
                    )
                }
            </InfoSection>

            <InfoSection
                title={isOwnProfile ? "Мои события" : "События"}
                className="profile-section"
            >
                {
                    createdEvents.length === 0 ? (
                        <div className="profile-empty">
                            <p>
                                {
                                    isOwnProfile
                                        ? "Ты ещё не создавал общих тренировок."
                                        : "Пользователь пока не создавал событий."
                                }
                            </p>

                            {
                                isOwnProfile && (
                                    <Link to="/events/create">
                                        <Button variant="secondary">
                                            Создать событие
                                        </Button>
                                    </Link>
                                )
                            }
                        </div>
                    ) : (
                        <>
                            <div className="profile-events-preview">
                                {
                                    createdEvents
                                        .slice(0, PROFILE_PREVIEW_LIMIT)
                                        .map((event) => (
                                            <EventSummary
                                                key={event.id}
                                                event={event}
                                                registrations={registrations}
                                            />
                                        ))
                                }
                            </div>

                            <ActionGroup>
                                <Link to={isOwnProfile ? "/profile/events" : `/u/${user.nickname}/events`}>
                                    <Button variant="secondary">
                                        Все события
                                    </Button>
                                </Link>
                            </ActionGroup>
                        </>
                    )
                }
            </InfoSection>

            <InfoSection
                title="Подписки"
                className="profile-section"
            >
                {
                    !canViewSubscriptions ? (
                        <div className="profile-empty">
                            <p>
                                Пользователь закрыл список подписок от посторонних.
                            </p>
                        </div>
                    ) : followingIds.length === 0 ? (
                        <div className="profile-empty">
                            <p>
                                {
                                    isOwnProfile
                                        ? "Ты пока ни на кого не подписан."
                                        : "Пользователь пока ни на кого не подписан."
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <SubscriptionsList
                                userIds={followingIds.slice(0, SUBSCRIPTIONS_PREVIEW_LIMIT)}
                            />

                            {
                                followingIds.length > SUBSCRIPTIONS_PREVIEW_LIMIT && (
                                    <ActionGroup>
                                        <Link to={isOwnProfile ? "/profile/subscriptions" : `/u/${user.nickname}/subscriptions`}>
                                            <Button variant="secondary">
                                                Все подписки
                                            </Button>
                                        </Link>
                                    </ActionGroup>
                                )
                            }
                        </>
                    )
                }
            </InfoSection>

            {
                isOwnProfile && (
                    <InfoSection
                        title="Настройки"
                        className="profile-section"
                    >
                        <div className="profile-account-actions">
                            <Link
                                to="/profile/tags"
                                className="profile-account-actions__item"
                            >
                                <span>Мои теги</span>

                                <span className="profile-account-actions__value">
                                    {userTagsCount} / {MAX_PERSONAL_TAGS}
                                </span>
                            </Link>

                            <Link
                                to="/profile/settings"
                                className="profile-account-actions__item"
                            >
                                <span>Настройки аккаунта</span>
                            </Link>

                            <button
                                type="button"
                                className="profile-account-actions__item profile-account-actions__item--soon"
                                disabled
                            >
                                <span>Выйти</span>
                                <span className="profile-account-actions__soon">Скоро</span>
                            </button>
                        </div>
                    </InfoSection>
                )
            }
        </Section>
    );
}
