import { useNavigate } from "react-router-dom";

import "../../styles/components/event-not-found.css";

import Button from "../ui/Button/Button";

/**
 * Error state (UX §41): событие не найдено — например, было удалено
 * или ссылка устарела.
 */
export default function EventNotFound() {

    const navigate = useNavigate();

    return (

        <section className="event-not-found">

            <h1 className="event-not-found__title">
                Событие не найдено
            </h1>

            <p className="event-not-found__message">
                Возможно, оно было удалено или больше недоступно.
            </p>

            <Button
                variant="primary"
                onClick={() => navigate("/events")}
            >
                Вернуться к событиям
            </Button>

        </section>

    );
}
