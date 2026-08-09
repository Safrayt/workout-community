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
import {
    FavoriteProvider,
} from "./context/FavoriteContext";
import {
    ReviewProvider,
} from "./context/ReviewContext";

export default function App() {
    return (
        <CurrentUserProvider>

            <RegistrationProvider>

                <PlaygroundProvider>

                    <EventProvider>

                        <FavoriteProvider>

                            <WorkoutDiaryProvider>

                                <ReviewProvider>

                                    <RouterProvider
                                        router={router}
                                    />

                                </ReviewProvider>

                            </WorkoutDiaryProvider>

                        </FavoriteProvider>

                    </EventProvider>

                </PlaygroundProvider>

            </RegistrationProvider>

        </CurrentUserProvider>
    );
}