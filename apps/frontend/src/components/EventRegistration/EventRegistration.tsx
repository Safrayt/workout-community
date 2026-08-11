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

    return (

        <Button

            variant={
                isRegistered
                    ? "secondary"
                    : "primary"
            }

            onClick={
                isRegistered
                    ? () => cancel(eventId)
                    : () => register(eventId)
            }

        >

            {
                isRegistered
                    ? "Я участвую"
                    : "Хочу участвовать"
            }

        </Button>

    );

}