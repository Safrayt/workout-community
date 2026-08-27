import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    Subscription,
} from "../types/subscription";

import {
    listSubscriptions,
    subscribeToUser,
    unsubscribeFromUser,
} from "../api/social";

import {
    useCurrentUser,
} from "./CurrentUserContext";

import {
    isSubscribed,
} from "../utils/subscriptions";


type SubscriptionContextType = {
    /**
     * Накопительный кеш: подписки текущего пользователя (загружаются
     * сразу при монтировании) + подписки любых других пользователей,
     * чью страницу "Подписки" открывали в этой сессии (через
     * refreshSubscriptions) — см. страницу Subscriptions.tsx.
     */
    subscriptions: Subscription[];

    refreshSubscriptions: (userId: string) => Promise<void>;

    subscribe: (
        followingId: string
    ) => Promise<void>;

    unsubscribe: (
        followingId: string
    ) => Promise<void>;

    toggleSubscription: (
        followingId: string
    ) => Promise<void>;

    checkSubscription: (
        followingId: string
    ) => boolean;
};


const SubscriptionContext =
    createContext<
        SubscriptionContextType | undefined
    >(undefined);



export function SubscriptionProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [
        subscriptions,
        setSubscriptions,
    ] = useState<Subscription[]>([]);


    const {
        currentUser,
    } = useCurrentUser();

    const currentUserId =
        currentUser.id;


    useEffect(() => {
        listSubscriptions(currentUserId)
            .then(setSubscriptions)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить подписки:",
                    error
                );
            });
    }, [currentUserId]);


    async function refreshSubscriptions(userId: string) {
        const fetched = await listSubscriptions(userId);

        setSubscriptions((current) => [
            ...current.filter(
                (subscription) => subscription.followerId !== userId
            ),
            ...fetched,
        ]);
    }


    async function subscribe(
        followingId: string
    ) {
        // Нельзя подписаться на самого себя и нельзя дублировать
        // подписку — бэкенд тоже это проверяет (400/идемпотентно), но
        // короткое замыкание здесь избавляет от лишнего запроса.
        if (
            followingId === currentUserId ||
            isSubscribed(
                subscriptions,
                currentUserId,
                followingId
            )
        ) {
            return;
        }

        const newSubscription =
            await subscribeToUser(followingId);

        setSubscriptions(
            (previous) => [
                ...previous,
                newSubscription,
            ]
        );
    }



    async function unsubscribe(
        followingId: string
    ) {
        await unsubscribeFromUser(followingId);

        setSubscriptions(
            (previous) =>
                previous.filter(
                    (subscription) =>
                        !(
                            subscription.followerId === currentUserId &&
                            subscription.followingId === followingId
                        )
                )
        );
    }



    async function toggleSubscription(
        followingId: string
    ) {
        if (
            isSubscribed(
                subscriptions,
                currentUserId,
                followingId
            )
        ) {
            await unsubscribe(followingId);

            return;
        }

        await subscribe(followingId);
    }



    function checkSubscription(
        followingId: string
    ) {
        return isSubscribed(
            subscriptions,
            currentUserId,
            followingId
        );
    }



    return (
        <SubscriptionContext.Provider
            value={{
                subscriptions,
                refreshSubscriptions,
                subscribe,
                unsubscribe,
                toggleSubscription,
                checkSubscription,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}



export function useSubscriptions() {
    const context =
        useContext(
            SubscriptionContext
        );


    if (!context) {
        throw new Error(
            "useSubscriptions must be used inside SubscriptionProvider"
        );
    }


    return context;
}
