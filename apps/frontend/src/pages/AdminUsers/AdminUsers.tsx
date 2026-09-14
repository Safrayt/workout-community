import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import Badge from "../../components/ui/Badge/Badge";

import "../../styles/components/admin-users.css";

import type { User } from "../../types/user";

import { deleteUser, listUsers, setUserFeedRestriction } from "../../api/users";
import { ApiError } from "../../api/errors";
import { formatDate } from "../../utils/formatDate";

import { useCurrentUser } from "../../context/CurrentUserContext";

/**
 * Раздел "Пользователи" в админ-панели — виден и доступен только
 * администратору (см. app/RequireAdmin.tsx и маршрут /admin/users в
 * router.tsx). Намеренно не переиспользует общий UserDirectoryContext
 * (он read-only и нужен всему остальному приложению для резолвинга
 * чужих профилей) — здесь своя копия списка со своими мутациями
 * (удаление, ограничение ленты), чтобы не путать эти два разных
 * назначения одного и того же списка пользователей.
 */
export default function AdminUsers() {
    const { currentUser } = useCurrentUser();

    const [users, setUsers] = useState<User[]>([]);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
        "loading"
    );
    const [search, setSearch] = useState("");
    const [busyUserId, setBusyUserId] = useState<string | null>(null);

    function load() {
        setStatus("loading");

        listUsers()
            .then((fetched) => {
                setUsers(fetched);
                setStatus("loaded");
            })
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить список пользователей:",
                    error
                );
                setStatus("error");
            });
    }

    useEffect(load, []);

    const normalizedSearch = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) =>
        user.nickname.toLowerCase().includes(normalizedSearch)
    );

    async function handleToggleFeedRestriction(user: User) {
        setBusyUserId(user.id);

        try {
            const updated = await setUserFeedRestriction(
                user.id,
                !user.isFeedRestricted
            );

            setUsers((current) =>
                current.map((item) => (item.id === user.id ? updated : item))
            );
        } catch (error: unknown) {
            console.error("Не удалось изменить видимость в ленте:", error);

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Не удалось выполнить действие. Попробуйте ещё раз."
            );
        } finally {
            setBusyUserId(null);
        }
    }

    async function handleDelete(user: User) {
        const confirmed = window.confirm(
            `Удалить пользователя «${user.nickname}» вместе со всеми его ` +
                `данными (записи дневника, отзывы, комментарии и т.п.)? ` +
                `Это действие необратимо.`
        );

        if (!confirmed) {
            return;
        }

        setBusyUserId(user.id);

        try {
            await deleteUser(user.id);
            setUsers((current) => current.filter((item) => item.id !== user.id));
        } catch (error: unknown) {
            // 400 от бэкенда здесь означает конкретно "у пользователя
            // есть свои площадки/мероприятия" (см. UserHasOwnedContentError
            // в app/user_deletion.py) — предлагаем удалить их вместе с
            // пользователем, а не просто показываем ошибку.
            if (error instanceof ApiError && error.status === 400) {
                const confirmedWithContent = window.confirm(
                    `${error.message}\n\nУдалить пользователя вместе с этим ` +
                        `контентом? Это необратимо.`
                );

                if (confirmedWithContent) {
                    try {
                        await deleteUser(user.id, { withOwnedContent: true });
                        setUsers((current) =>
                            current.filter((item) => item.id !== user.id)
                        );
                    } catch (retryError: unknown) {
                        console.error(
                            "Не удалось удалить пользователя:",
                            retryError
                        );
                        window.alert(
                            retryError instanceof Error
                                ? retryError.message
                                : "Не удалось удалить пользователя."
                        );
                    }
                }
            } else {
                console.error("Не удалось удалить пользователя:", error);
                window.alert(
                    error instanceof Error
                        ? error.message
                        : "Не удалось удалить пользователя."
                );
            }
        } finally {
            setBusyUserId(null);
        }
    }

    return (
        <div className="admin-users">
            <h1 className="admin-users__title">Пользователи</h1>

            <Input
                id="admin-users-search"
                label="Поиск по имени пользователя"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Введите nickname…"
            />

            {
                status === "loading" && (
                    <p className="admin-users__status">Загрузка…</p>
                )
            }

            {
                status === "error" && (
                    <div className="admin-users__error">
                        <p>Не удалось загрузить список пользователей.</p>

                        <Button onClick={load}>Повторить</Button>
                    </div>
                )
            }

            {
                status === "loaded" &&
                    (
                        filteredUsers.length === 0 ? (
                            <p className="admin-users__empty">
                                {
                                    users.length === 0
                                        ? "Пользователей пока нет."
                                        : "По этому запросу никого не найдено."
                                }
                            </p>
                        ) : (
                            <ul className="admin-users__list">
                                {
                                    filteredUsers.map((user) => (
                                        <li
                                            key={user.id}
                                            className="admin-users__row"
                                        >
                                            <div className="admin-users__info">
                                                <Link
                                                    to={`/u/${user.nickname}`}
                                                    className="admin-users__nickname"
                                                >
                                                    {user.nickname}
                                                </Link>

                                                {
                                                    user.isAdmin && (
                                                        <Badge variant="warning">
                                                            Администратор
                                                        </Badge>
                                                    )
                                                }

                                                {
                                                    user.isFeedRestricted && (
                                                        <span className="private-record-badge">
                                                            Скрыт из ленты
                                                        </span>
                                                    )
                                                }

                                                <span className="admin-users__date">
                                                    Регистрация: {formatDate(user.createdAt)}
                                                </span>
                                            </div>

                                            <div className="admin-users__actions">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={busyUserId === user.id}
                                                    onClick={() =>
                                                        handleToggleFeedRestriction(user)
                                                    }
                                                >
                                                    {
                                                        user.isFeedRestricted
                                                            ? "Вернуть в ленту"
                                                            : "Убрать из ленты"
                                                    }
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    disabled={
                                                        busyUserId === user.id ||
                                                        user.id === currentUser.id
                                                    }
                                                    onClick={() => handleDelete(user)}
                                                >
                                                    Удалить
                                                </Button>
                                            </div>
                                        </li>
                                    ))
                                }
                            </ul>
                        )
                    )
            }
        </div>
    );
}
