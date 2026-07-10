import { Outlet } from "react-router-dom";

import Header from "./Header";
import Navigation from "./Navigation";
import Footer from "./Footer";

export default function Layout() {
    return (
        <>
            <Header />

            <Navigation />

            <main>
                <Outlet />
            </main>

            <Footer />
        </>
    );
}