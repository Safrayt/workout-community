import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import {
    CurrentUserProvider,
} from "./context/CurrentUserContext";

/**
 * Все остальные (доменные) провайдеры теперь живут в
 * app/ProtectedLayout.tsx — они требуют вошедшего пользователя,
 * а /login и /register рендерятся без них. См. комментарий там.
 */
export default function App() {
    return (
        <CurrentUserProvider>

            <RouterProvider
                router={router}
            />

        </CurrentUserProvider>
    );
}
