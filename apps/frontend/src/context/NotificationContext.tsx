import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { getUnreadNotificationCount } from "../api/notifications";

import { useAuth } from "./CurrentUserContext";

type NotificationContextValue = {
    unreadCount: number;

    /**
     * Перечитывает счётчик непрочитанных уведомлений с сервера.
     * Страница уведомлений вызывает это после того, как что-то
     * отмечено прочитанным, чтобы бейдж в навигации сразу обновился.
     *
     * Намеренно НЕ кешируем здесь сам список уведомлений целиком —
     * учитывая недавний баг с устаревшим WorkoutDiaryContext (список
     * дневника грузился один раз за сессию и не обновлялся сам по
     * себе), список уведомлений на своей странице каждый раз
     * запрашивается заново напрямую через api/notifications.ts, а не
     * через общий кеш в контексте.
     */
    refreshUnreadCount: () => Promise<void>;
};

const NotificationContext = createContext<
    NotificationContextValue | undefined
>(undefined);

/**
 * В отличие от остальных доменных провайдеров (которые живут только
 * внутри ProtectedLayout, под гарантией вошедшего пользователя), этот
 * провайдер смонтирован в App.tsx, рядом с CurrentUserProvider —
 * потому что бейдж с количеством непрочитанных уведомлений показывает
 * Navigation.tsx, а он используется и в макете для гостя (страница
 * /playgrounds без входа, см. ProtectedLayout.tsx). Поэтому сам себя
 * подстраховывает через useAuth(): без вошедшего пользователя счётчик
 * просто остаётся нулём и запрос на сервер не уходит.
 */
export function NotificationProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { user } = useAuth();

    const [unreadCount, setUnreadCount] = useState(0);

    async function refreshUnreadCount() {
        if (!user) {
            return;
        }

        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
    }

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        refreshUnreadCount().catch((error: unknown) => {
            console.error(
                "Не удалось загрузить число непрочитанных уведомлений:",
                error
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return (
        <NotificationContext.Provider
            value={{ unreadCount, refreshUnreadCount }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotifications must be used inside NotificationProvider"
        );
    }

    return context;
}
