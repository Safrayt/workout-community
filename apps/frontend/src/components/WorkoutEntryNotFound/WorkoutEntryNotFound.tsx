import { useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-not-found.css";

import Button from "../ui/Button/Button";

/**
 * Error state (UX-DIARY-ENTRY §27): запись не найдена — например,
 * была удалена или ссылка устарела.
 */
export default function WorkoutEntryNotFound() {

    const navigate = useNavigate();

    return (

        <section className="workout-entry-not-found">

            <h1 className="workout-entry-not-found__title">
                Запись не найдена
            </h1>

            <p className="workout-entry-not-found__message">
                Возможно, она была удалена или больше недоступна.
            </p>

            <Button
                variant="primary"
                onClick={() => navigate("/diary")}
            >
                Вернуться в дневник
            </Button>

        </section>

    );
}
