import { Navigate, useLocation } from "react-router-dom";

import Layout from "../components/layout/Layout";

import { useAuth } from "../context/CurrentUserContext";

import { PlaygroundProvider } from "../context/PlaygroundContext";
import { EventProvider } from "../context/EventContext";
import { RegistrationProvider } from "../context/RegistrationContext";
import { WorkoutDiaryProvider } from "../context/WorkoutDiaryContext";
import { DiaryNotesProvider } from "../context/DiaryNotesContext";
import { PersonalTagsProvider } from "../context/PersonalTagsContext";
import { FavoriteProvider } from "../context/FavoriteContext";
import { ReviewProvider } from "../context/ReviewContext";
import { SubscriptionProvider } from "../context/SubscriptionContext";
import { CommentProvider } from "../context/CommentContext";

/**
 * Всё содержимое приложения, кроме /login и /register, монтируется
 * только здесь — под гарантией, что currentUser не null. Именно
 * поэтому все доменные провайдеры (Playground, Event, дневник и
 * т.д. — они все читают currentUser.id через useCurrentUser)
 * перенесены сюда из App.tsx: если бы они оставались на самом
 * верху дерева, они бы монтировались и для /login тоже, где
 * пользователя ещё нет.
 */
export default function ProtectedLayout() {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="app-loading-screen">
                Загрузка…
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return (
        <PlaygroundProvider>
            <EventProvider>
                <RegistrationProvider>
                    <FavoriteProvider>
                        <WorkoutDiaryProvider>
                            <DiaryNotesProvider>
                                <PersonalTagsProvider>
                                    <ReviewProvider>
                                        <SubscriptionProvider>
                                            <CommentProvider>
                                                <Layout />
                                            </CommentProvider>
                                        </SubscriptionProvider>
                                    </ReviewProvider>
                                </PersonalTagsProvider>
                            </DiaryNotesProvider>
                        </WorkoutDiaryProvider>
                    </FavoriteProvider>
                </RegistrationProvider>
            </EventProvider>
        </PlaygroundProvider>
    );
}
