import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import {
    RegistrationProvider,
} from "./context/RegistrationContext";
import {
    PlaygroundProvider,
} from "./context/PlaygroundContext";

export default function App() {
    return (
        <RegistrationProvider>

            <PlaygroundProvider>

                <RouterProvider router={router} />

            </PlaygroundProvider>

        </RegistrationProvider>
    );
}