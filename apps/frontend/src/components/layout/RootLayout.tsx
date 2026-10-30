import { Outlet } from "react-router-dom";

import RouteMeta from "./RouteMeta";

/**
 * Корень всех маршрутов (без собственного адреса): общее для каждой
 * страницы сайта, в том числе для тех, что стоят вне Layout, — вход,
 * регистрация, политика конфиденциальности.
 */
export default function RootLayout() {
    return (
        <>
            <RouteMeta />

            <Outlet />
        </>
    );
}
