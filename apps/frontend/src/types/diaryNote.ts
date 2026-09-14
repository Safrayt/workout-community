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

    /** См. WorkoutEntry.hideFromFeed — та же механика для заметок. */
    hideFromFeed?: boolean;

    /** См. WorkoutEntry.isPrivate — та же механика для заметок. */
    isPrivate?: boolean;

};
