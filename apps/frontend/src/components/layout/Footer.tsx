import { Link } from "react-router-dom";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <p>© {currentYear} Workout Community</p>

            <nav className="app-footer__legal">
                <Link to="/terms">Пользовательское соглашение</Link>
                <Link to="/privacy">Политика конфиденциальности</Link>
            </nav>

            <small>
                MVP Portal • Open Source Project
            </small>
        </footer>
    );
}