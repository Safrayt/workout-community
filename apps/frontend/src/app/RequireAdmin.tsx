import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useCurrentUser } from "../context/CurrentUserContext";

type RequireAdminProps = {
    children: ReactNode;

    /** Куда отправить не-администратора. По умолчанию — на /complexes. */
    redirectTo?: string;
};

/**
 * Обёртка для маршрутов, доступных только администратору (сейчас —
 * добавление/редактирование комплексов). Живёт внутри
 * ProtectedLayout, поэтому currentUser здесь уже точно не гость —
 * этот компонент проверяет только is_admin, а не сам факт входа.
 */
export default function RequireAdmin({
    children,
    redirectTo = "/complexes",
}: RequireAdminProps) {
    const { currentUser } = useCurrentUser();

    if (!currentUser.isAdmin) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
