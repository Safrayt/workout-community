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
import {
    WorkoutDiaryProvider,
} from "./context/WorkoutDiaryContext";

export default function App() {
    return (
        <CurrentUserProvider>

            <RegistrationProvider>

                <PlaygroundProvider>

                    <EventProvider>

                        <WorkoutDiaryProvider>

                            <RouterProvider
                                router={router}
                            />

                        </WorkoutDiaryProvider>

                    </EventProvider>

                </PlaygroundProvider>

            </RegistrationProvider>

        </CurrentUserProvider>
    );
}