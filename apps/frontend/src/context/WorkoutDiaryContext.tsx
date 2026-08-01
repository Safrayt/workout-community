import {
    createContext,
    useContext,
    useState,
} from "react";

import type {
    WorkoutEntry,
    TimeOfDay,
} from "../types/workoutEntry";

import type {
    NewWorkoutEntry,
} from "../types/newWorkoutEntry";

import {
    workoutEntries as initialWorkoutEntries,
} from "../data/workoutEntries";

import {
    useCurrentUser,
} from "./CurrentUserContext";

type WorkoutDiaryContextType = {
    entries: WorkoutEntry[];

    addEntry: (
        entry: NewWorkoutEntry
    ) => WorkoutEntry;
};

const WorkoutDiaryContext =
    createContext<WorkoutDiaryContextType | undefined>(undefined);


export function WorkoutDiaryProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [
        entries,
        setEntries,
    ] = useState(
        initialWorkoutEntries
    );

    const {
        currentUser,
    } = useCurrentUser();

    function addEntry(
        entry: NewWorkoutEntry
    ) {
        const newEntry: WorkoutEntry = {
            id: crypto.randomUUID(),

            userId: currentUser.id,

            playgroundId:
                entry.playgroundId || undefined,

            date: entry.date,

            timeOfDay:
                (entry.timeOfDay || undefined) as
                    TimeOfDay | undefined,

            title: entry.title,

            description:
                entry.description || undefined,

            createdAt: new Date().toISOString(),
        };

        setEntries(
            (current) => [
                ...current,
                newEntry,
            ]
        );

        return newEntry;
    }

    return (
        <WorkoutDiaryContext.Provider
            value={{
                entries,
                addEntry,
            }}
        >
            {children}
        </WorkoutDiaryContext.Provider>
    );
}

export function useWorkoutDiary() {
    const context =
        useContext(
            WorkoutDiaryContext
        );

    if (!context) {
        throw new Error(
            "useWorkoutDiary must be used inside WorkoutDiaryProvider"
        );
    }

    return context;
}