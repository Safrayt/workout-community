import { Link } from "react-router-dom";

export default function Navigation() {
    return (
        <nav>
            <Link to="/">Главная</Link>{" "}
            <Link to="/events">Тренировки</Link>{" "}
            <Link to="/map">Карта</Link>{" "}
            <Link to="/programs">Программы</Link>{" "}
            <Link to="/profile">Профиль</Link>
        </nav>
    );
}