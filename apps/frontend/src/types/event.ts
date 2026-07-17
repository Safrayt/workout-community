export type Event = {
    id: string;

    title: string;

    description: string;

    city: string;

    location: string;

    playgroundId: string;

    startDate: string;

    expectedParticipants: number;

    weather?: string;
};