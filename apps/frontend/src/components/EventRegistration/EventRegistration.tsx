import Button from "../ui/Button/Button";

import {
    useRegistration,
} from "../../context/RegistrationContext";

type Props = {

    eventId: string;

};

export default function EventRegistration({
    eventId,
}: Props) {

    const {

        register,

        cancel,

        checkRegistration,

    } = useRegistration();

    const isRegistered =
        checkRegistration(
            eventId
        );

    function handleClick() {
        const action = isRegistered ? cancel(eventId) : register(eventId);

        action.catch((error: unknown) => {
            console.error(
                "Не удалось изменить регистрацию на мероприятие:",
                error
            );
        });
    }

    return (

        <Button

            variant={
                isRegistered
                    ? "secondary"
                    : "primary"
            }

            onClick={handleClick}

        >

            {
                isRegistered
                    ? "Я участвую"
                    : "Хочу участвовать"
            }

        </Button>

    );

}