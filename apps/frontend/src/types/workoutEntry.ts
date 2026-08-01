export type TimeOfDay =
    | "morning"
    | "day"
    | "evening"
    | "night";

export type WorkoutEntry = {

    id: string;

    userId: string;

    playgroundId?: string;

    date: string;

    timeOfDay?: TimeOfDay;

    title: string;

    description?: string;

    createdAt: string;

};