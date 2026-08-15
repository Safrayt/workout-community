import type { WorkoutEntryPhoto } from "./workoutEntry";

export type DiaryNote = {

    id: string;

    userId: string;

    date: string;

    title?: string;

    text: string;

    photos?: WorkoutEntryPhoto[];

    playgroundId?: string;

    tags?: string[];

    createdAt: string;

};
