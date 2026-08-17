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
    DiaryNotesProvider,
} from "./context/DiaryNotesContext";
import {
    PersonalTagsProvider,
} from "./context/PersonalTagsContext";
import {
    FavoriteProvider,
} from "./context/FavoriteContext";
import {
    ReviewProvider,
} from "./context/ReviewContext";
import {
    SubscriptionProvider,
} from "./context/SubscriptionContext";
import {
    CommentProvider,
} from "./context/CommentContext";

export default function App() {
    return (
        <CurrentUserProvider>

            <RegistrationProvider>

                <PlaygroundProvider>

                    <EventProvider>

                        <FavoriteProvider>

                            <WorkoutDiaryProvider>

                                <DiaryNotesProvider>

                                    <PersonalTagsProvider>

                                        <ReviewProvider>

                                            <SubscriptionProvider>

                                                <CommentProvider>

                                                    <RouterProvider
                                                        router={router}
                                                    />

                                                </CommentProvider>

                                            </SubscriptionProvider>

                                        </ReviewProvider>

                                    </PersonalTagsProvider>

                                </DiaryNotesProvider>

                            </WorkoutDiaryProvider>

                        </FavoriteProvider>

                    </EventProvider>

                </PlaygroundProvider>

            </RegistrationProvider>

        </CurrentUserProvider>
    );
}