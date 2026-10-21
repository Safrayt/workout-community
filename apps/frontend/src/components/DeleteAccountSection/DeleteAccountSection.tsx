import { useState } from "react";

import Input from "../ui/Input/Input";
import Button from "../ui/Button/Button";

import "../../styles/components/delete-account-section.css";

import { useAuth } from "../../context/CurrentUserContext";

import { deleteOwnAccount } from "../../api/users";
import { ApiError } from "../../api/errors";
import { markAccountDeleted } from "../../api/token";

type DeleteAccountSectionProps = {
    /** Скачивание архива дневника — то же действие, что и в разделе
     * "Мои данные" выше на странице: перед удалением его стоит
     * сделать, поэтому кнопка дублируется прямо в предупреждении. */
    onExport: () => void;
    isExporting: boolean;
};

/**
 * "Опасная зона" в самом низу настроек аккаунта: безвозвратное
 * удаление аккаунта по текущему паролю.
 *
 * Сворачивается в одну кнопку, пока человек сам не нажмёт на неё —
 * чтобы поле пароля (которое браузеры любят автозаполнять) не
 * висело на странице постоянно рядом с необратимым действием.
 *
 * Если у пользователя есть свои площадки/мероприятия/программы,
 * сервер при первой попытке отвечает 409 и ничего не удаляет —
 * тогда показываем список и просим отдельное подтверждение.
 */
export default function DeleteAccountSection({
    onExport,
    isExporting,
}: DeleteAccountSectionProps) {
    const { logout } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Текст 409 от сервера со списком площадок/событий/программ.
    // null — такого контента нет (или сервер ещё не спрашивали).
    const [ownedContentNotice, setOwnedContentNotice] =
        useState<string | null>(null);
    const [isOwnedContentConfirmed, setIsOwnedContentConfirmed] =
        useState(false);

    function close() {
        setIsOpen(false);
        setPassword("");
        setError(null);
        setOwnedContentNotice(null);
        setIsOwnedContentConfirmed(false);
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!password) {
            setError("Введите пароль, чтобы подтвердить удаление.");
            return;
        }

        if (ownedContentNotice && !isOwnedContentConfirmed) {
            setError(
                "Подтвердите, что созданный вами контент тоже будет удалён."
            );
            return;
        }

        setError(null);
        setIsDeleting(true);

        try {
            await deleteOwnAccount(password, ownedContentNotice !== null);

            // Выход сбрасывает пользователя, и ProtectedLayout сам
            // перекинет на /login. Сообщение "аккаунт удалён" для
            // страницы входа передаём отметкой в sessionStorage, а не
            // через state роутера — тот ProtectedLayout затирает
            // своим (см. api/token.ts).
            markAccountDeleted();
            logout();
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                setOwnedContentNotice(err.message);
                setIsOwnedContentConfirmed(false);
                setIsDeleting(false);
                return;
            }

            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось удалить аккаунт. Попробуйте ещё раз."
            );
            setIsDeleting(false);
        }
    }

    return (
        <section
            className="delete-account"
            aria-labelledby="delete-account-title"
        >
            <h4
                id="delete-account-title"
                className="delete-account__title"
            >
                Опасная зона
            </h4>

            {!isOpen ? (
                <>
                    <p className="delete-account__text">
                        Удаление аккаунта вместе со всеми вашими данными.
                        Это действие нельзя отменить.
                    </p>

                    <Button
                        type="button"
                        variant="outline"
                        className="delete-account__open-button"
                        onClick={() => setIsOpen(true)}
                    >
                        Удалить аккаунт…
                    </Button>
                </>
            ) : (
                <form
                    className="delete-account__form"
                    onSubmit={handleSubmit}
                >
                    <div className="delete-account__banner delete-account__banner--danger">
                        <strong>
                            ⚠ Удаление безвозвратно
                        </strong>

                        <p>
                            Восстановить аккаунт и данные будет
                            невозможно — даже с ключом восстановления.
                            Будет удалено:
                        </p>

                        <ul>
                            <li>записи дневника и заметки вместе с фотографиями;</li>
                            <li>ваши отзывы и комментарии;</li>
                            <li>избранное, подписки и подписчики;</li>
                            <li>выполненные комплексы и достижения;</li>
                            <li>уведомления.</li>
                        </ul>

                        <p>
                            Ваш никнейм после этого снова станет
                            доступен для регистрации любому человеку.
                        </p>
                    </div>

                    <div className="delete-account__banner delete-account__banner--info">
                        <strong>
                            💾 Сначала сохраните записи дневника
                        </strong>

                        <p>
                            Мы рекомендуем скачать архив с тренировками,
                            заметками и фотографиями: после удаления
                            аккаунта получить его будет уже нельзя.
                        </p>

                        <Button
                            type="button"
                            variant="outline"
                            className="delete-account__export-button"
                            onClick={onExport}
                            disabled={isExporting || isDeleting}
                        >
                            {isExporting ? "Готовим архив…" : "Скачать записи"}
                        </Button>
                    </div>

                    {ownedContentNotice && (
                        <div
                            className="delete-account__banner delete-account__banner--danger"
                            role="alert"
                        >
                            <strong>
                                ⚠ Вместе с аккаунтом будет удалён ваш контент
                            </strong>

                            <p>{ownedContentNotice}</p>

                            <label className="delete-account__checkbox">
                                <input
                                    type="checkbox"
                                    checked={isOwnedContentConfirmed}
                                    disabled={isDeleting}
                                    onChange={(event) =>
                                        setIsOwnedContentConfirmed(
                                            event.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Я понимаю, что этот контент будет
                                    удалён безвозвратно
                                </span>
                            </label>
                        </div>
                    )}

                    <Input
                        id="delete-account-password"
                        label="Ваш пароль"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        value={password}
                        disabled={isDeleting}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    {error && (
                        <p className="delete-account__error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="delete-account__buttons">
                        <Button
                            type="submit"
                            variant="danger"
                            className="delete-account__button"
                            disabled={isDeleting}
                        >
                            {isDeleting
                                ? "Удаляем…"
                                : ownedContentNotice
                                    ? "Удалить аккаунт и контент"
                                    : "Удалить аккаунт навсегда"}
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            className="delete-account__button"
                            disabled={isDeleting}
                            onClick={close}
                        >
                            Отмена
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
