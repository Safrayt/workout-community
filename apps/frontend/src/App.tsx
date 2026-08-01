import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import {
    RegistrationProvider,
} from "./context/RegistrationContext";
import {
    PlaygroundProvider,
} from "./context/PlaygroundContext";
import {
    EventProvider,
} from "./context/EventContext";
import {
    CurrentUserProvider,
} from "./context/CurrentUserContext";

export default function App() {
    return (
        <CurrentUserProvider>

            <RegistrationProvider>

                <PlaygroundProvider>

                    <EventProvider>

                        <RouterProvider
                            router={router}
                        />

                    </EventProvider>

                </PlaygroundProvider>

            </RegistrationProvider>

        </CurrentUserProvider>
    );
}