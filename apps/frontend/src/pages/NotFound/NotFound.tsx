import { useNavigate } from "react-router-dom";

import Button from "../../components/ui/Button/Button";

import "../../styles/components/not-found.css";

/**
 * Общая страница 404 — для любого пути, не совпавшего ни с одним
 * маршрутом (опечатка в URL, устаревшая внешняя ссылка и т.п.).
 * В отличие от точечных *NotFound (EventNotFound, WorkoutEntryNotFound
 * и др.), которые показываются, когда сущность не найдена ПО ID,
 * эта — когда не найден сам маршрут.
 */
export default function NotFound() {
    const navigate = useNavigate();

    return (
        <section className="not-found">
            <p className="not-found__code">404</p>

            <h1 className="not-found__title">
                Страница не найдена
            </h1>

            <p className="not-found__message">
                Возможно, ссылка устарела или в адресе опечатка.
            </p>

            <Button
                variant="primary"
                onClick={() => navigate("/")}
            >
                На главную
            </Button>
        </section>
    );
}
