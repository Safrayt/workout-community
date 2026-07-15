export type RegistrationStatus =
    | "registered"
    | "cancelled"
    | "attended";

export type EventRegistration = {
    id: string;

    userId: string;

    eventId: string;

    registeredAt: string;

    status: RegistrationStatus;

    experienceAwarded: number;
};