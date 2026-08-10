// import Section from "../../components/ui/Section/Section";
// import Input from "../../components/ui/Input/Input";
// import Button from "../../components/ui/Button/Button";
// import Select from "../../components/ui/Select/Select";


// export default function Profile() {
//     return (
//         <Section title="Профиль">
//             <Input
//                 id="name"
//                 label="Имя"
//                 placeholder="Введите имя"
//             />

//             <Input
//                 id="city"
//                 label="Город"
//                 placeholder="Например, Минск"
//             />
            
//             <Select
//                 id="level"
//                 label="Уровень подготовки"
//                 options={[
//                     { value: "beginner", label: "Новичок" },
//                     { value: "intermediate", label: "Средний" },
//                     { value: "advanced", label: "Продвинутый" },
//                 ]}
//             />            

//             <Button>
//                 Сохранить
//             </Button>
//         </Section>
//     );
// }

import Section from "../../components/ui/Section/Section";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { getUserLevel } from "../../utils/level";

import { useRegistration } from "../../context/RegistrationContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useEvents,
} from "../../context/EventContext";

import { getUserEvents, getCreatedEvents,} from "../../utils/events";

import {
    getCreatedPlaygrounds,
} from "../../utils/playgrounds";

import {
    useFavorites,
} from "../../context/FavoriteContext";

import {
    getFavoritePlaygrounds,
} from "../../utils/favorites";

import PlaygroundCard from "../../components/PlaygroundCard/PlaygroundCard";
import "../../styles/components/playgrounds-list.css";

import {isUpcomingEvent, isCompletedEvent,} from "../../utils/eventStatus";

import EventSummary from "../../components/EventSummary/EventSummary";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import { Link } from "react-router-dom";

import {
    getAchievementsProgress,
} from "../../utils/achievements";
import AchievementCard from "../../components/AchievementCard/AchievementCard";


export default function Profile() {

    const {
        currentUser: user,
    } = useCurrentUser();

    const {
        registrations,
    } = useRegistration();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        events,
    } = useEvents();

    const userEvents = getUserEvents(
        events,
        registrations,
        user.id
    );

    const createdEvents =
    getCreatedEvents(
        events,
        user.id
    );

    const createdPlaygrounds =
    getCreatedPlaygrounds(
        playgrounds,
        user.id
    );

    const {
        favorites,
    } = useFavorites();

    const favoritePlaygrounds =
        getFavoritePlaygrounds(
            playgrounds,
            favorites,
            user.id
        );

    const upcomingEvents =
    userEvents.filter(
        isUpcomingEvent
    );


    const completedEvents =
        userEvents.filter(
            isCompletedEvent
        );

    const achievementsProgress =
        getAchievementsProgress(
            user.id,
            events,
            playgrounds,
            registrations
        );

    const unlockedAchievements =
    achievementsProgress.filter(
        (item) => item.unlocked
    );    


    return (
        <Section title="Профиль">
            <InfoSection title="Основная информация">

                <h2>
                    {user.name}
                </h2>

                <p>
                    {user.nickname}
                </p>

                    {
                        user.bio && (
                            <p>
                                {user.bio}
                            </p>
                        )
                    }

                <InfoRow label="Населённый пункт">
                    {user.locality}
                </InfoRow>

                <InfoRow label="Уровень">
                    {getUserLevel(user.experience)}
                </InfoRow>

                <InfoRow label="Опыт">
                    {user.experience} XP
                </InfoRow>
            </InfoSection>    

            <InfoSection title="Мой вклад в сообщество">
                <InfoRow label="Созданные события">
                    {createdEvents.length}
                </InfoRow>

                <InfoRow label="Добавленные площадки">
                    {createdPlaygrounds.length}
                </InfoRow>
            </InfoSection>

            <InfoSection title="Избранные площадки">

                {
                    favoritePlaygrounds.length === 0

                        ? (

                            <p>
                                Пока нет избранных площадок.
                            </p>

                        )

                        : (

                            <div className="playgrounds-list">

                                {
                                    favoritePlaygrounds.map(
                                        (playground) => (

                                            <PlaygroundCard
                                                key={playground.id}
                                                playground={playground}
                                            />

                                        )
                                    )
                                }

                            </div>

                        )

                }

            </InfoSection>

            <InfoSection title="Достижения">

                {
                    unlockedAchievements.length === 0

                        ? (

                            <p>
                                Пока нет достижений.
                            </p>

                        )

                        : (

                            <ul>

                                {
                                    unlockedAchievements

                                        .slice(0, 3)

                                        .map(
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

                <ActionGroup>

                    <Link
                        to="/achievements"
                    >

                        <Button
                            variant="secondary"
                        >

                            Все достижения

                        </Button>

                    </Link>

                </ActionGroup>

            </InfoSection>

            <InfoSection title="Предстоящие события">
                {
                    upcomingEvents.length === 0 ? (
                        <p>
                            Нет предстоящих событий
                        </p>
                    ) : (
                        <div>
                            {upcomingEvents.map(
                                (event) => (
                                    <EventSummary
                                        key={event.id}
                                        event={event}
                                        registrations={registrations}
                                    />
                                )
                            )}
                        </div>
                    )
                }

            </InfoSection>
            
            <InfoSection title="Завершённые события">
                {
                    completedEvents.length === 0 ? (
                        <p>
                            Нет завершённых событий
                        </p>
                    ) : (
                        <div>
                            {completedEvents.map(
                                (event) => (
                                    <EventSummary
                                        key={event.id}
                                        event={event}
                                        registrations={registrations}
                                    />
                                )
                            )}
                        </div>
                    )
                }                
            </InfoSection>

            <InfoSection title="Социальные сети">
                {
                    user.socialLinks.telegram && (
                        <InfoRow label="Telegram">
                            {user.socialLinks.telegram}
                        </InfoRow>
                    )
                }

                {
                    user.socialLinks.vk && (
                        <InfoRow label="VK">
                            {user.socialLinks.vk}
                        </InfoRow>
                    )
                }
            </InfoSection>
        </Section>
    );
}