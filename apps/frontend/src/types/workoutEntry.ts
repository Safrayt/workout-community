export type TimeOfDay =
    | "morning"
    | "day"
    | "evening"
    | "night";

export type WorkoutEntryPhoto = {

    id: string;

    url: string;

    isMain?: boolean;

};

export type WorkoutEntry = {

    id: string;

    userId: string;

    playgroundId?: string;

    date: string;

    timeOfDay?: TimeOfDay;

    tags?: string[];

    title: string;

    description?: string;

    photos?: WorkoutEntryPhoto[];

    createdAt: string;

};