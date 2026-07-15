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

import { getUserEvents } from "../../utils/events";

import {isUpcomingEvent, isCompletedEvent,} from "../../utils/eventStatus";


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
            <h2>{user.name}</h2>

            <p>{user.nickname}</p>

            <p>Населённый пункт: {user.locality}</p>

            <p>{user.bio}</p>

            <p>Уровень:{" "}
                <strong>
                    {getUserLevel(user.experience)}
                </strong>
            </p>

            <p> Опыт: {user.experience} XP </p>

            <h3> Предстоящие события </h3>
                {
                    upcomingEvents.length === 0 ? (
                        <p>
                            Нет предстоящих событий
                        </p>
                    ) : (
                        <ul>
                            {upcomingEvents.map(
                                (event) => (
                                    <li key={event.id}>
                                        {event.title}
                                    </li>
                                )
                            )}
                        </ul>
                    )
                }
            <h3> Завершённые события </h3>
            {
                completedEvents.length === 0 ? (
                    <p>
                        Нет завершённых событий
                    </p>
                ) : (
                    <ul>
                        {completedEvents.map(
                            (event) => (
                                <li key={event.id}>
                                    {event.title}
                                </li>
                            )
                        )}
                    </ul>
                )
            }

            {user.socialLinks.telegram && (
                <p>
                    Telegram: {user.socialLinks.telegram}
                </p>
            )}

            {user.socialLinks.vk && (
                <p>
                    VK: {user.socialLinks.vk}
                </p>
            )}
        </Section>
    );
}
