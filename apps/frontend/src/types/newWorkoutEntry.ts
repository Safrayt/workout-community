export type NewWorkoutEntryPhoto = {

    id: string;

    url: string;

    isMain: boolean;

};

export type NewWorkoutEntry = {

    date: string;

    timeOfDay: string;

    tags: string[];

    playgroundId: string;

    title: string;

    description: string;

    photos: NewWorkoutEntryPhoto[];

};