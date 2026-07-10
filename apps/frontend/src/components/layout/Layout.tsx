import { Outlet } from "react-router-dom";

import Header from "./Header";
import Navigation from "./Navigation";
import Footer from "./Footer";

export default function Layout() {
    return (
        <>
            <div className="container">
                <Header />

                <Navigation />

                <main className="page">
                    <Outlet />
                </main>

                <Footer />
            </div>
        </>
    );
}