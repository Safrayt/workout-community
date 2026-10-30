import { Link } from "react-router-dom";

import { SITE_NAME } from "../../constants/site";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <p>© {currentYear} {SITE_NAME}</p>

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