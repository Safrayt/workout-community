import { Navigate, useLocation } from "react-router-dom";

import Layout from "../components/layout/Layout";

import { useAuth } from "../context/CurrentUserContext";

import { PlaygroundProvider } from "../context/PlaygroundContext";
import { EventProvider } from "../context/EventContext";
import { RegistrationProvider } from "../context/RegistrationContext";
import { WorkoutDiaryProvider } from "../context/WorkoutDiaryContext";
import { ComplexProvider } from "../context/ComplexContext";
import { ComplexCommentProvider } from "../context/ComplexCommentContext";
import { DiaryNotesProvider } from "../context/DiaryNotesContext";
import { PersonalTagsProvider } from "../context/PersonalTagsContext";
import { FavoriteProvider } from "../context/FavoriteContext";
import { ReviewProvider } from "../context/ReviewContext";
import { SubscriptionProvider } from "../context/SubscriptionContext";
import { CommentProvider } from "../context/CommentContext";
import { UserDirectoryProvider } from "../context/UserDirectoryContext";

/**
 * Всё содержимое приложения, кроме /login и /register, монтируется
 * только здесь — под гарантией, что currentUser не null. Именно
 * поэтому все доменные провайдеры (Playground, Event, дневник и
 * т.д. — они все читают currentUser.id через useCurrentUser)
 * перенесены сюда из App.tsx: если бы они оставались на самом
 * верху дерева, они бы монтировались и для /login тоже, где
 * пользователя ещё нет.
 */
/**
 * Пути, доступные без входа в систему. Сейчас это только карта и
 * список площадок — единственная страница, для которой это явно
 * попросили; бэкенд для GET /playgrounds и без токена отдаёт данные
 * (см. routers/playgrounds.py). Всё остальное (детали площадки,
 * добавление, редактирование и т.д.) по-прежнему требует входа.
 */
const PUBLIC_PATHS = ["/playgrounds"];

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
        if (PUBLIC_PATHS.includes(location.pathname)) {
            // Гостю показываем карту площадок в обычном макете
            // (шапка/навигация не зависят от текущего пользователя),
            // но без остальных провайдеров — они рассчитаны на
            // вошедшего пользователя и здесь не нужны: сама
            // страница Playgrounds использует только usePlaygrounds().
            return (
                <PlaygroundProvider>
                    <Layout />
                </PlaygroundProvider>
            );
        }

        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return (
        <UserDirectoryProvider>
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
                                                    <ComplexProvider>
                                                        <ComplexCommentProvider>
                                                            <Layout />
                                                        </ComplexCommentProvider>
                                                    </ComplexProvider>
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
        </UserDirectoryProvider>
    );
}
