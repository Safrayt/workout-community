import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import {
    CurrentUserProvider,
} from "./context/CurrentUserContext";
import { NotificationProvider } from "./context/NotificationContext";

import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

/**
 * Все остальные (доменные) провайдеры теперь живут в
 * app/ProtectedLayout.tsx — они требуют вошедшего пользователя,
 * а /login и /register рендерятся без них. См. комментарий там.
 *
 * NotificationProvider — исключение: он живёт здесь, а не в
 * ProtectedLayout, потому что бейдж с числом непрочитанных
 * уведомлений показывает Navigation.tsx, а она используется и в
 * макете для гостя (см. PUBLIC_PATHS в ProtectedLayout.tsx). Сам
 * провайдер ничего не запрашивает с сервера, пока пользователь не
 * вошёл (см. useAuth() внутри NotificationContext.tsx).
 *
 * ErrorBoundary — снаружи всего остального: он должен пережить
 * падение и роутера, и CurrentUserProvider, чтобы поймать ошибку
 * рендера где угодно в дереве.
 */
export default function App() {
    return (
        <ErrorBoundary>
            <CurrentUserProvider>
                <NotificationProvider>

                    <RouterProvider
                        router={router}
                    />

                </NotificationProvider>
            </CurrentUserProvider>
        </ErrorBoundary>
    );
}
