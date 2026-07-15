import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import {
    RegistrationProvider,
} from "./context/RegistrationContext";

export default function App() {
    return (
        <RegistrationProvider>
            <RouterProvider router={router} />
        </RegistrationProvider>
    );
}