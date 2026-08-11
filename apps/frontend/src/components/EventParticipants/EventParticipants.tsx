import "../../styles/components/event-participants.css";

import type {
    EventRegistration,
} from "../../types/eventRegistration";

import Avatar from "../ui/Avatar/Avatar";

import {
    getUserById,
} from "../../utils/users";

import {
    getUserLevel,
} from "../../utils/level";

type Props = {

    participants:
        EventRegistration[];

    creatorId: string;

};

/**
 * Список записавшихся на событие.
 *
 * Продуктовое решение: в отличие от UX-документа (который требует
 * полной анонимизации — только число, без имён и аватаров), здесь
 * сознательно показывается список участников. Вид — минималистичный:
 * только ник (без полного имени) и место под уровень/репутацию
 * конкретного пользователя.
 *
 * Отдельного блока "Создатель события" нет: создатель — это первый
 * участник (он автоматически регистрируется при создании события,
 * см. CreateEvent.tsx), поэтому он просто закреплён первым в этом
 * списке и помечен бейджем "Создатель".
 */
export default function EventParticipants({
    participants,
    creatorId,
}: Props) {

    if (
        participants.length === 0
    ) {
        return (
            <p className="event-participants__empty">
                Пока никто не заявил о своём участии. Станьте первым.
            </p>
        );
    }

    const sortedParticipants =
        [...participants].sort(
            (a, b) => {
                const aIsCreator = a.userId === creatorId;
                const bIsCreator = b.userId === creatorId;

                if (aIsCreator !== bIsCreator) {
                    return aIsCreator ? -1 : 1;
                }

                return (
                    new Date(b.registeredAt).getTime() -
                    new Date(a.registeredAt).getTime()
                );
            }
        );

    return (

        <ul className="event-participants">

            {
                sortedParticipants.map(
                    (participant) => {

                        const user =
                            getUserById(
                                participant.userId
                            );

                        const nickname =
                            user?.nickname ?? "неизвестный";

                        const isCreator =
                            participant.userId === creatorId;

                        return (

                            <li
                                key={participant.id}
                                className="event-participants__item"
                            >
                                <Avatar
                                    name={nickname}
                                    avatarUrl={user?.avatarUrl}
                                    size="sm"
                                />

                                <span className="event-participants__nickname">
                                    {`@${nickname}`}
                                </span>

                                {
                                    isCreator && (
                                        <span className="event-participants__creator-badge">
                                            Создатель
                                        </span>
                                    )
                                }

                                {
                                    user && (
                                        <span className="event-participants__reputation">
                                            {getUserLevel(user.experience)}
                                            {" · "}
                                            {user.experience}
                                            {" XP"}
                                        </span>
                                    )
                                }
                            </li>

                        );

                    }
                )
            }

        </ul>

    );
}
