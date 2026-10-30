import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Переход на другую страницу открывает её сверху.
 *
 * Без этого браузер при переходе внутри приложения сохраняет прокрутку:
 * нажали на упражнение в конце длинного списка — и страница упражнения
 * открывается уже прокрученной вниз.
 *
 * - Срабатывает только при смене пути (pathname). Смена фильтров в адресе
 *   (?query) и переход к якорю (#hash) прокрутку не трогают.
 * - Кнопки «Назад» и «Вперёд» (POP) не трогаем: браузер сам вернёт
 *   прежнее место на странице.
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();

    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current === pathname) return;

        previousPathname.current = pathname;

        if (navigationType !== "POP") {
            window.scrollTo(0, 0);
        }
    }, [pathname, navigationType]);

    return null;
}
