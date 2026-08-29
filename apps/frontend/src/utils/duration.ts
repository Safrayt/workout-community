export type Hms = {
    hours: number;
    minutes: number;
    seconds: number;
};

export function secondsToHms(totalSeconds: number): Hms {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));

    return {
        hours: Math.floor(safeSeconds / 3600),
        minutes: Math.floor((safeSeconds % 3600) / 60),
        seconds: safeSeconds % 60,
    };
}

export function hmsToSeconds(
    hours: number,
    minutes: number,
    seconds: number
): number {
    return hours * 3600 + minutes * 60 + seconds;
}
