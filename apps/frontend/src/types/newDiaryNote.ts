import type { NewWorkoutEntryPhoto } from "./newWorkoutEntry";

export type NewDiaryNote = {

    title: string;

    text: string;

    photos: NewWorkoutEntryPhoto[];

    playgroundId: string;

    tags: string[];

    hideFromFeed: boolean;

    isPrivate: boolean;

};
