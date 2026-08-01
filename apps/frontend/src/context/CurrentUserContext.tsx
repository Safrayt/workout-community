import {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

import {
    users,
} from "../data/users";

import type {
    User,
} from "../types/user";

type CurrentUserContextValue = {
    currentUser: User;
    setCurrentUser: Dispatch<
        SetStateAction<User>
    >;
};

const CurrentUserContext =
    createContext<
        CurrentUserContextValue | undefined
    >(undefined);

export function CurrentUserProvider({
    children,
}: {
    children: ReactNode;
}) {

    const [
        currentUser,
        setCurrentUser,
    ] = useState<User>(
        users[0]
    );

    return (

        <CurrentUserContext.Provider
            value={{

                currentUser,

                setCurrentUser,

            }}
        >

            {children}

        </CurrentUserContext.Provider>

    );

}

export function useCurrentUser() {

    const context =
        useContext(
            CurrentUserContext
        );

    if (!context) {

        throw new Error(
            "useCurrentUser must be used inside CurrentUserProvider"
        );

    }

    return context;

}