import { Link } from "react-router-dom";

import Navigation from "./Navigation";

export default function Header() {
    return (
        <header className="app-header">
            <div className="app-header__inner">
                <Link to="/" className="app-header__brand">
                    <span className="app-header__logo" aria-hidden="true">
                        WC
                    </span>

                    <span className="app-header__brand-name">
                        Workout Community
                    </span>
                </Link>

                <Navigation />
            </div>
        </header>
    );
}
