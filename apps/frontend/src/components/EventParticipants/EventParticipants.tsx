import type {
    EventRegistration,
} from "../../types/eventRegistration";

import {
    getUserName,
} from "../../utils/users";

type Props = {

    participants:
        EventRegistration[];

};

export default function EventParticipants({
    participants,
}: Props) {

    if (
        participants.length === 0
    ) {
        return (
            <p>
                Пока никто не зарегистрировался.
            </p>
        );
    }

    return (

        <ul>

            {
                participants.map(
                    (participant) => (

                        <li
                            key={participant.id}
                        >
                            {getUserName(
                                participant.userId
                            )}
                        </li>

                    )
                )
            }

        </ul>

    );
}