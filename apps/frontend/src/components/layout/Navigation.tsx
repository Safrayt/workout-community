import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/CurrentUserContext";

export default function Navigation() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <nav className="app-navigation">
            <NavLink to="/" end>Главная</NavLink>

            <NavLink to="/events">События</NavLink>

            <NavLink to="/playgrounds">Площадки</NavLink>

            <NavLink to="/diary">Дневник</NavLink>

            <NavLink to="/profile">Профиль</NavLink>

            <button
                type="button"
                className="app-navigation__logout"
                onClick={handleLogout}
            >
                Выйти
            </button>
        </nav>
    );
}