import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";

import "../../styles/components/recovery-key-notice.css";

import { useCurrentUser } from "../../context/CurrentUserContext";

/**
 * Напоминание для аккаунтов, созданных до появления ключа
 * восстановления: без ключа при потере пароля вернуть аккаунт нельзя.
 * Показывается только когда сервер явно сообщил, что ключа нет
 * (hasRecoveryKey === false); пока данные не загрузились или ключ
 * уже создан — ничего не рисует.
 */
export default function RecoveryKeyNotice() {
    const { currentUser } = useCurrentUser();

    if (currentUser.hasRecoveryKey !== false) {
        return null;
    }

    return (
        <div className="recovery-key-notice" role="note">
            <p className="recovery-key-notice__text">
                <strong>Создайте ключ восстановления.</strong> Если вы
                забудете пароль, без него вернуть аккаунт не получится:
                на портале нет почты и других контактов.
            </p>

            <Link to="/profile/settings">
                <Button variant="secondary">Создать ключ</Button>
            </Link>
        </div>
    );
}
