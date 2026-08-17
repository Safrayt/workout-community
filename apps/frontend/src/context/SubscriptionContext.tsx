import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type {
    Subscription,
} from "../types/subscription";

import {
    subscriptions as initialSubscriptions,
} from "../data/subscriptions";

import {
    useCurrentUser,
} from "./CurrentUserContext";

import {
    isSubscribed,
} from "../utils/subscriptions";


type SubscriptionContextType = {
    subscriptions: Subscription[];

    subscribe: (
        followingId: string
    ) => void;

    unsubscribe: (
        followingId: string
    ) => void;

    toggleSubscription: (
        followingId: string
    ) => void;

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
    ] = useState<Subscription[]>(
        initialSubscriptions
    );


    const {
        currentUser,
    } = useCurrentUser();

    const currentUserId =
        currentUser.id;



    function subscribe(
        followingId: string
    ) {
        // Нельзя подписаться на самого себя и нельзя дублировать
        // подписку.
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


        const newSubscription: Subscription =
        {
            id: crypto.randomUUID(),

            followerId: currentUserId,

            followingId,

            createdAt:
                new Date().toISOString(),
        };


        setSubscriptions(
            (previous) => [
                ...previous,
                newSubscription,
            ]
        );
    }



    function unsubscribe(
        followingId: string
    ) {
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



    function toggleSubscription(
        followingId: string
    ) {
        if (
            isSubscribed(
                subscriptions,
                currentUserId,
                followingId
            )
        ) {
            unsubscribe(followingId);

            return;
        }

        subscribe(followingId);
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
