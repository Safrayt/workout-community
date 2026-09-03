import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import {
    CurrentUserProvider,
} from "./context/CurrentUserContext";

import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

/**
 * Все остальные (доменные) провайдеры теперь живут в
 * app/ProtectedLayout.tsx — они требуют вошедшего пользователя,
 * а /login и /register рендерятся без них. См. комментарий там.
 *
 * ErrorBoundary — снаружи всего остального: он должен пережить
 * падение и роутера, и CurrentUserProvider, чтобы поймать ошибку
 * рендера где угодно в дереве.
 */
export default function App() {
    return (
        <ErrorBoundary>
            <CurrentUserProvider>

                <RouterProvider
                    router={router}
                />

            </CurrentUserProvider>
        </ErrorBoundary>
    );
}
