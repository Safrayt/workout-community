import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Pagination from "../../components/ui/Pagination/Pagination";
import Button from "../../components/ui/Button/Button";

import "../../styles/components/home-feed-tabs.css";
import "../../styles/components/notifications.css";

import {
    listNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../../api/notifications";

import { useNotifications } from "../../context/NotificationContext";

import { paginate, getTotalPages } from "../../utils/pagination";
import { formatTimeAgo } from "../../utils/timeAgo";

import type { Notification, NotificationType } from "../../types/notification";

const PAGE_SIZE = 20;

const FILTERS: { value: NotificationType | "all"; label: string }[] = [
    { value: "all", label: "Все" },
    { value: "diary_comment", label: "Дневник" },
    { value: "playground_comment", label: "Площадки" },
    { value: "event_comment", label: "События" },
    { value: "mention", label: "Упоминания" },
];

function renderNotificationMessage(notification: Notification) {
    const { type, targetUrl, targetTitle } = notification;

    const quotedTitle = targetTitle ? `«${targetTitle}»` : undefined;

    if (type === "mention") {
        return (
            <>
                Вас отметили{" "}
                <Link to={targetUrl}>
                    {quotedTitle ? `на странице ${quotedTitle}` : "на странице"}
                </Link>
            </>
        );
    }

    const noun =
        type === "diary_comment"
            ? "записи"
            : type === "playground_comment"
                ? "площадки"
                : "события";

    return (
        <>
            На странице{" "}
            <Link to={targetUrl}>
                {quotedTitle ? `${noun} ${quotedTitle}` : noun}
            </Link>{" "}
            добавился новый комментарий
        </>
    );
}

export default function Notifications() {
    const { refreshUnreadCount } = useNotifications();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [filter, setFilter] = useState<NotificationType | "all">("all");
    const [page, setPage] = useState(1);

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);

        listNotifications(filter === "all" ? undefined : filter)
            .then(setNotifications)
            .catch((error: unknown) => {
                console.error("Не удалось загрузить уведомления:", error);
                setLoadError(
                    "Не удалось загрузить уведомления. Попробуйте обновить страницу."
                );
            })
            .finally(() => setIsLoading(false));
    }, [filter]);

    function handleFilterChange(nextFilter: NotificationType | "all") {
        setFilter(nextFilter);
        setPage(1);
    }

    function handleOpen(notification: Notification) {
        if (notification.isRead) {
            return;
        }

        setNotifications((current) =>
            current.map((item) =>
                item.id === notification.id ? { ...item, isRead: true } : item
            )
        );

        markNotificationAsRead(notification.id)
            .then(() => refreshUnreadCount())
            .catch((error: unknown) => {
                console.error("Не удалось отметить уведомление прочитанным:", error);
            });
    }

    function handleMarkAllAsRead() {
        setNotifications((current) =>
            current.map((item) => ({ ...item, isRead: true }))
        );

        markAllNotificationsAsRead()
            .then(() => refreshUnreadCount())
            .catch((error: unknown) => {
                console.error("Не удалось отметить все уведомления прочитанными:", error);
            });
    }

    const hasUnread = notifications.some((item) => !item.isRead);

    const totalPages = getTotalPages(notifications.length, PAGE_SIZE);
    const visibleNotifications = paginate(notifications, page, PAGE_SIZE);

    return (
        <Section title="Уведомления">
            <p className="notifications__intro">
                Комментарии к вашим записям, площадкам и мероприятиям, а
                также упоминания через @Ник.
            </p>

            <div className="notifications__toolbar">
                <div
                    className="home-feed-tabs"
                    role="tablist"
                >
                    {
                        FILTERS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="tab"
                                aria-selected={filter === option.value}
                                className={`home-feed-tabs__tab ${
                                    filter === option.value
                                        ? "home-feed-tabs__tab--active"
                                        : ""
                                }`}
                                onClick={() => handleFilterChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))
                    }
                </div>

                {
                    hasUnread && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleMarkAllAsRead}
                        >
                            Отметить всё прочитанным
                        </Button>
                    )
                }
            </div>

            {
                isLoading ? (
                    <p className="notifications__status">Загрузка…</p>
                ) : loadError ? (
                    <p className="notifications__status notifications__status--error">
                        {loadError}
                    </p>
                ) : notifications.length === 0 ? (
                    <p className="notifications__status">
                        Здесь пока пусто — уведомления появятся, когда кто-то
                        прокомментирует ваши записи, площадки или мероприятия,
                        либо отметит вас через @Ник.
                    </p>
                ) : (
                    <>
                        <ul className="notifications__list">
                            {
                                visibleNotifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        className={`notifications__item ${
                                            notification.isRead
                                                ? ""
                                                : "notifications__item--unread"
                                        }`}
                                        onClick={() => handleOpen(notification)}
                                    >
                                        <p className="notifications__text">
                                            {renderNotificationMessage(notification)}
                                        </p>

                                        <span className="notifications__time">
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </li>
                                ))
                            }
                        </ul>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </>
                )
            }
        </Section>
    );
}
