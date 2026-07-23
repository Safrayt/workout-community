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

import { currentUser } from "../../data/currentUser";

import { getUserLevel } from "../../utils/level";

import { events } from "../../data/events";

import { useRegistration } from "../../context/RegistrationContext";

import { getUserEvents, getCreatedEvents,} from "../../utils/events";

import {isUpcomingEvent, isCompletedEvent,} from "../../utils/eventStatus";

import EventSummary from "../../components/EventSummary/EventSummary";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import { Link } from "react-router-dom";


export default function Profile() {
    const user = currentUser;

    const {
        registrations
    } = useRegistration();

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

    const upcomingEvents =
    userEvents.filter(
        isUpcomingEvent
    );


    const completedEvents =
        userEvents.filter(
            isCompletedEvent
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
                    Пока нет
                </InfoRow>
            </InfoSection>

            <InfoSection title="Действия">
                <ActionGroup>
                    <Link to="/events/create">
                        <Button variant="primary">
                            Создать событие
                        </Button>
                    </Link>

                    <Link to="/playgrounds/add">
                        <Button variant="secondary">
                            Добавить площадку
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
