import { NavLink } from "react-router-dom";

export default function Navigation() {
    return (
        <nav className="app-navigation">
            <NavLink to="/" end>Главная</NavLink>

            <NavLink to="/events">Тренировки</NavLink>

            <NavLink to="/map">Карта</NavLink>

            <NavLink to="/programs">Программы</NavLink>

            <NavLink to="/profile">Профиль</NavLink>
        </nav>
    );
}