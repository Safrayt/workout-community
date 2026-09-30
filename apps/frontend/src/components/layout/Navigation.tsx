import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/CurrentUserContext";
import { useNotifications } from "../../context/NotificationContext";

import Avatar from "../ui/Avatar/Avatar";

/**
 * Комплексы и программы — оба про структурированный тренировочный
 * контент (а не про конкретную тренировку в дневнике или конкретное
 * место/событие), поэтому в узком меню они спрятаны за один пункт
 * "Тренировки", а не занимают два отдельных места в верхней строке.
 */
const TRAINING_LINKS = [
    { to: "/complexes", label: "Комплексы" },
    { to: "/programs", label: "Программы" },
];

function IconBurger() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
    );
}

function IconClose() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

function IconChevron() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

function IconBell() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
    );
}

export default function Navigation() {
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTrainingOpen, setIsTrainingOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    const trainingRef = useRef<HTMLDivElement>(null);
    const accountRef = useRef<HTMLDivElement>(null);

    // Закрыть всё сразу — вешаем на клик по каждой ссылке/пункту
    // меню, чтобы после перехода на новую страницу открытая панель
    // не оставалась висеть поверх неё.
    function closeAll() {
        setIsMenuOpen(false);
        setIsTrainingOpen(false);
        setIsAccountOpen(false);
    }

    // Клик вне выпадающего списка закрывает именно его.
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (trainingRef.current && !trainingRef.current.contains(target)) {
                setIsTrainingOpen(false);
            }

            if (accountRef.current && !accountRef.current.contains(target)) {
                setIsAccountOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Esc закрывает любое открытое меню — и мобильную панель, и
    // выпадающие списки.
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
                setIsTrainingOpen(false);
                setIsAccountOpen(false);
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    function handleLogout() {
        closeAll();
        logout();
        navigate("/login", { replace: true });
    }

    const isTrainingActive = TRAINING_LINKS.some((link) =>
        location.pathname.startsWith(link.to)
    );

    return (
        <nav className="app-nav">
            <button
                type="button"
                className="app-nav__burger"
                aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
                aria-expanded={isMenuOpen}
                aria-controls="app-mobile-menu"
                onClick={() => setIsMenuOpen((open) => !open)}
            >
                {isMenuOpen ? <IconClose /> : <IconBurger />}
            </button>

            <div className="app-nav__links">
                <NavLink to="/" end className="app-nav__link">
                    Главная
                </NavLink>

                <NavLink to="/playgrounds" className="app-nav__link">
                    Площадки
                </NavLink>

                <NavLink to="/events" className="app-nav__link">
                    События
                </NavLink>

                <NavLink to="/diary" className="app-nav__link">
                    Дневник
                </NavLink>

                <div className="app-nav__dropdown" ref={trainingRef}>
                    <button
                        type="button"
                        className={
                            "app-nav__link app-nav__dropdown-trigger" +
                            (isTrainingActive ? " active" : "")
                        }
                        aria-expanded={isTrainingOpen}
                        onClick={() => setIsTrainingOpen((open) => !open)}
                    >
                        Тренировки
                        <IconChevron />
                    </button>

                    {isTrainingOpen && (
                        <div className="app-nav__dropdown-panel">
                            {TRAINING_LINKS.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className="app-nav__dropdown-item"
                                    onClick={closeAll}
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="app-nav__spacer" />

            <div className="app-nav__actions">
                {user && (
                    <NavLink
                        to="/notifications"
                        className="app-nav__icon-btn"
                        aria-label="Уведомления"
                    >
                        <IconBell />

                        {unreadCount > 0 && (
                            <span className="app-nav__badge">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </NavLink>
                )}

                {user ? (
                    <div className="app-nav__dropdown app-nav__account" ref={accountRef}>
                        <button
                            type="button"
                            className="app-nav__account-trigger"
                            aria-expanded={isAccountOpen}
                            onClick={() => setIsAccountOpen((open) => !open)}
                        >
                            <Avatar
                                name={user.nickname}
                                avatarUrl={user.avatarUrl}
                                size="sm"
                            />

                            <span className="app-nav__account-name">
                                {user.nickname}
                            </span>

                            <IconChevron />
                        </button>

                        {isAccountOpen && (
                            <div className="app-nav__dropdown-panel app-nav__dropdown-panel--right">
                                <NavLink to="/profile" className="app-nav__dropdown-item" onClick={closeAll}>
                                    Профиль
                                </NavLink>

                                <NavLink to="/profile/settings" className="app-nav__dropdown-item" onClick={closeAll}>
                                    Настройки
                                </NavLink>

                                <NavLink to="/admin/users" className="app-nav__dropdown-item" onClick={closeAll}>
                                    Пользователи
                                </NavLink>

                                <button
                                    type="button"
                                    className="app-nav__dropdown-item app-nav__dropdown-item--danger"
                                    onClick={handleLogout}
                                >
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <NavLink to="/login" className="app-nav__login">
                        Войти
                    </NavLink>
                )}
            </div>

            {isMenuOpen && (
                <div id="app-mobile-menu" className="app-nav__mobile-panel">
                    <NavLink to="/" end className="app-nav__mobile-link" onClick={closeAll}>
                        Главная
                    </NavLink>

                    <NavLink to="/playgrounds" className="app-nav__mobile-link" onClick={closeAll}>
                        Площадки
                    </NavLink>

                    <NavLink to="/events" className="app-nav__mobile-link" onClick={closeAll}>
                        События
                    </NavLink>

                    <NavLink to="/diary" className="app-nav__mobile-link" onClick={closeAll}>
                        Дневник
                    </NavLink>

                    <NavLink to="/complexes" className="app-nav__mobile-link" onClick={closeAll}>
                        Комплексы
                    </NavLink>

                    <NavLink to="/programs" className="app-nav__mobile-link" onClick={closeAll}>
                        Программы
                    </NavLink>

                    {user && (
                        <>
                            <div className="app-nav__mobile-divider" />

                            <NavLink to="/notifications" className="app-nav__mobile-link" onClick={closeAll}>
                                Уведомления
                                {unreadCount > 0 && (
                                    <span className="app-nav__badge app-nav__badge--inline">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </NavLink>

                            <NavLink to="/profile" className="app-nav__mobile-link" onClick={closeAll}>
                                Профиль
                            </NavLink>

                            <NavLink to="/profile/settings" className="app-nav__mobile-link" onClick={closeAll}>
                                Настройки
                            </NavLink>

                            <NavLink to="/admin/users" className="app-nav__mobile-link" onClick={closeAll}>
                                Пользователи
                            </NavLink>

                            <button
                                type="button"
                                className="app-nav__mobile-link app-nav__mobile-link--danger"
                                onClick={handleLogout}
                            >
                                Выйти
                            </button>
                        </>
                    )}

                    {!user && (
                        <>
                            <div className="app-nav__mobile-divider" />

                            <NavLink to="/login" className="app-nav__mobile-link" onClick={closeAll}>
                                Войти
                            </NavLink>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
