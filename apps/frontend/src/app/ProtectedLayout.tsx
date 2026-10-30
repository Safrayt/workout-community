import type { ComponentType, ReactNode } from "react";
import { Navigate, useLocation, useMatches } from "react-router-dom";

import Layout from "../components/layout/Layout";

import { useAuth } from "../context/CurrentUserContext";

import { PlaygroundProvider } from "../context/PlaygroundContext";
import { EventProvider } from "../context/EventContext";
import { RegistrationProvider } from "../context/RegistrationContext";
import { EventCommentProvider } from "../context/EventCommentContext";
import { WorkoutDiaryProvider } from "../context/WorkoutDiaryContext";
import { ComplexProvider } from "../context/ComplexContext";
import { ExerciseProvider } from "../context/ExerciseContext";
import { ComplexCommentProvider } from "../context/ComplexCommentContext";
import { ProgramProvider } from "../context/ProgramContext";
import { ProgramCommentProvider } from "../context/ProgramCommentContext";
import { DiaryNotesProvider } from "../context/DiaryNotesContext";
import { PersonalTagsProvider } from "../context/PersonalTagsContext";
import { FavoriteProvider } from "../context/FavoriteContext";
import { ReviewProvider } from "../context/ReviewContext";
import { SubscriptionProvider } from "../context/SubscriptionContext";
import { CommentProvider } from "../context/CommentContext";
import { UserDirectoryProvider } from "../context/UserDirectoryContext";

import {
    getGuestProviderGroups,
    type GuestProviderGroup,
} from "./guestAccess";

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
 * Провайдеры, которые монтируются гостю на публичных страницах (см.
 * handle.guest в router.tsx и guestAccess.ts). Порядок внутри группы —
 * порядок вложенности: RegistrationProvider читает EventProvider, так
 * что внутри него. Одинаковые провайдеры из разных групп монтируются
 * один раз (см. GuestProviders).
 *
 * Публичные страницы — площадки, события, упражнения и статьи; бэкенд
 * отдаёт их GET-запросы и без токена (см. test_public_access.py).
 * Создание, редактирование, дневник, профили и т.д. по-прежнему
 * требуют входа. Всё, что в этих группах зависит от пользователя
 * (регистрация на событие, комментарии, кнопки админа), учитывает,
 * что его может не быть.
 */
type GuestProvider = ComponentType<{ children: ReactNode }>;

const GUEST_PROVIDERS: Record<GuestProviderGroup, GuestProvider[]> = {
    playgrounds: [PlaygroundProvider],
    // Страница конкретной площадки: события и регистрации (блок
    // "Ближайшие мероприятия"), дневник (счётчики активности — общая
    // лента, которую бэкенд и так фильтрует по приватности), избранное
    // и отзывы. Избранное у гостя не загружается (см. FavoriteContext).
    playground: [
        UserDirectoryProvider,
        PlaygroundProvider,
        EventProvider,
        RegistrationProvider,
        FavoriteProvider,
        WorkoutDiaryProvider,
        ReviewProvider,
    ],
    exercises: [ExerciseProvider],
    // Страница упражнения показывает, в какие комплексы оно входит.
    exercise: [ExerciseProvider, ComplexProvider],
    events: [
        UserDirectoryProvider,
        PlaygroundProvider,
        EventProvider,
        RegistrationProvider,
        EventCommentProvider,
    ],
    // Комплексы и программы: каталог грузится публичным запросом.
    // Страница одного комплекса/программы добавляет комментарии и
    // каталог пользователей (имена авторов). Личное — история
    // выполнений комплекса, избранное, черновики — гостю не
    // загружается (см. ComplexDetails и ProgramDetails).
    complexes: [ComplexProvider],
    // Страница комплекса ссылается на его упражнения и складывает их
    // мышцы, поэтому ей нужна и база упражнений.
    complex: [
        UserDirectoryProvider,
        ExerciseProvider,
        ComplexProvider,
        ComplexCommentProvider,
    ],
    programs: [ProgramProvider],
    program: [
        UserDirectoryProvider,
        ProgramProvider,
        ProgramCommentProvider,
    ],
};

function GuestProviders({
    groups,
    children,
}: {
    groups: GuestProviderGroup[];
    children: ReactNode;
}) {
    const providers = [
        ...new Set(groups.flatMap((group) => GUEST_PROVIDERS[group])),
    ];

    return providers.reduceRight<ReactNode>(
        (inner, Provider) => <Provider>{inner}</Provider>,
        children
    );
}

export default function ProtectedLayout() {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    const matches = useMatches();

    if (isLoading) {
        return (
            <div className="app-loading-screen">
                Загрузка…
            </div>
        );
    }

    if (!user) {
        const guestGroups = getGuestProviderGroups(matches);

        if (guestGroups) {
            // Публичная страница: показываем её гостю в обычном
            // макете (шапка/навигация от пользователя не зависят),
            // но только с теми провайдерами, которые ей нужны, —
            // остальные рассчитаны на вошедшего пользователя.
            return (
                <GuestProviders groups={guestGroups}>
                    <Layout />
                </GuestProviders>
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
                        <EventCommentProvider>
                            <FavoriteProvider>
                                <WorkoutDiaryProvider>
                                    <DiaryNotesProvider>
                                        <PersonalTagsProvider>
                                            <ReviewProvider>
                                                <SubscriptionProvider>
                                                    <CommentProvider>
                                                        <ComplexProvider>
                                                            <ExerciseProvider>
                                                                <ComplexCommentProvider>
                                                                    <ProgramProvider>
                                                                        <ProgramCommentProvider>
                                                                            <Layout />
                                                                        </ProgramCommentProvider>
                                                                    </ProgramProvider>
                                                                </ComplexCommentProvider>
                                                            </ExerciseProvider>
                                                        </ComplexProvider>
                                                    </CommentProvider>
                                                </SubscriptionProvider>
                                            </ReviewProvider>
                                        </PersonalTagsProvider>
                                    </DiaryNotesProvider>
                                </WorkoutDiaryProvider>
                            </FavoriteProvider>
                        </EventCommentProvider>
                    </RegistrationProvider>
                </EventProvider>
            </PlaygroundProvider>
        </UserDirectoryProvider>
    );
}
