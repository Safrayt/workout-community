import { NavLink } from "react-router-dom";

export default function Navigation() {
    return (
        <nav className="app-navigation">
            <NavLink to="/" end>Главная</NavLink>

            <NavLink to="/events">События</NavLink>

            <NavLink to="/playgrounds">Площадки</NavLink>

            <NavLink to="/programs">Программы</NavLink>

            <NavLink to="/profile">Профиль</NavLink>
        </nav>
    );
}