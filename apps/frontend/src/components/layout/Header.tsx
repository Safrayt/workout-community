import { Link } from "react-router-dom";

import Navigation from "./Navigation";

import { SITE_NAME } from "../../constants/site";

export default function Header() {
    return (
        <header className="app-header">
            <div className="app-header__inner">
                <Link to="/" className="app-header__brand">
                    <span className="app-header__logo" aria-hidden="true">
                        SW
                    </span>

                    <span className="app-header__brand-name">
                        {SITE_NAME}
                    </span>
                </Link>

                <Navigation />
            </div>
        </header>
    );
}
