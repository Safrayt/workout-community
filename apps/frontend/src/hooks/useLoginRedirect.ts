import { useLocation, useNavigate } from "react-router-dom";

/**
 * Возвращает функцию "отправить гостя на вход": после входа Login
 * вернёт человека на ту же страницу (читает state.from).
 *
 * Нужна на публичных страницах (см. guestAccess.ts), где есть
 * действия только для вошедших — "В избранное", "Записаться",
 * "Всё верно" и т.п. Вместо того чтобы прятать такие кнопки или
 * молча ничего не делать, ведём гостя на вход: он сам решает,
 * входить ли, а само действие после входа нужно нажать ещё раз.
 */
export function useLoginRedirect(): () => void {
    const navigate = useNavigate();
    const location = useLocation();

    return () => {
        navigate("/login", {
            state: { from: location.pathname + location.search },
        });
    };
}
