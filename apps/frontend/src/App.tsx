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

export default function App() {
    return (
        <RegistrationProvider>
            <PlaygroundProvider>
                <EventProvider>
                    <RouterProvider router={router} />
                </EventProvider>
            </PlaygroundProvider>
        </RegistrationProvider>
    );
}