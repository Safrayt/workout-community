import type { Playground } from "../types/playground";

import { getLastVerification } from "./playgroundHistory";

/**
 * Через сколько дней после последней проверки данные считаются
 * потенциально устаревшими и площадке предлагается новая проверка.
 */
export const INSPECTION_STALE_DAYS = 30;

export type InspectionStatus =
    | "neverInspected"
    | "changedSinceInspection"
    | "stale"
    | "upToDate";

function daysBetween(
    fromDate: string,
    toDate: string
) {
    const from = new Date(fromDate).getTime();
    const to = new Date(toDate).getTime();

    return (to - from) / (1000 * 60 * 60 * 24);
}

/**
 * Определяет, нужно ли предложить пользователю проверить площадку,
 * и почему: её ещё никто не проверял, информация менялась уже
 * после последней проверки, либо проверка была слишком давно.
 */
export function getInspectionStatus(
    playground: Playground
): InspectionStatus {

    const lastVerification = getLastVerification(playground);

    if (
        !lastVerification
    ) {
        return "neverInspected";
    }

    if (
        new Date(playground.updatedAt).getTime() >
        new Date(lastVerification.date).getTime()
    ) {
        return "changedSinceInspection";
    }

    const daysSinceInspection = daysBetween(
        lastVerification.date,
        new Date().toISOString()
    );

    if (
        daysSinceInspection > INSPECTION_STALE_DAYS
    ) {
        return "stale";
    }

    return "upToDate";

}
