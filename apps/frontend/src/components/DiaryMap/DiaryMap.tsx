import PlaygroundsMap from "../Map/PlaygroundsMap";

import type { WorkoutEntry } from "../../types/workoutEntry";
import type { Playground } from "../../types/playground";

import {
    getEntryCountsByPlayground,
    getPlaygroundsWithEntries,
} from "../../utils/diaryFilters";

import { getRatingTier } from "../../constants/playgroundRating";
import { calculatePlaygroundRating } from "../../utils/playgroundRating";
import { pluralizeRu } from "../../utils/pluralize";

import "../../styles/components/diary-map.css";

type DiaryMapProps = {

    entries: WorkoutEntry[];

    playgrounds: Playground[];

    selectedPlaygroundId: string;

    onSelectPlayground: (playgroundId: string) => void;

};

/**
 * "География тренировок" (UX-DIARY §6–10): карта показывает не все
 * площадки платформы, а только те, где пользователь реально
 * тренировался. Клик по метке сразу фильтрует список — отдельная
 * кнопка "Показать тренировки" не нужна (§8).
 */
export default function DiaryMap({
    entries,
    playgrounds,
    selectedPlaygroundId,
    onSelectPlayground,
}: DiaryMapProps) {
    const visitedPlaygrounds =
        getPlaygroundsWithEntries(
            entries,
            playgrounds
        );

    const entryCounts =
        getEntryCountsByPlayground(entries);

    const markers = visitedPlaygrounds.map(
        (playground) => {
            const count = entryCounts[playground.id] ?? 0;
            const rating = calculatePlaygroundRating(playground);

            return {
                id: playground.id,
                title: playground.name,
                latitude: playground.coordinates.latitude,
                longitude: playground.coordinates.longitude,
                url: `/playgrounds/${playground.id}`,
                locality: playground.locality,
                color: getRatingTier(rating).color,
                shortInfo:
                    `${count} ${pluralizeRu(count, ["тренировка", "тренировки", "тренировок"])}`,
            };
        }
    );

    if (visitedPlaygrounds.length === 0) {
        return (
            <p className="diary-map__empty">
                Отметь площадку в записи дневника — она появится здесь на карте.
            </p>
        );
    }

    return (
        <div className="diary-map">
            <PlaygroundsMap
                markers={markers}
                height="var(--diary-map-height, 400px)"
                showDetailsLink={false}
                selectedMarkerId={selectedPlaygroundId || undefined}
                onMarkerClick={(marker) =>
                    onSelectPlayground(
                        marker.id === selectedPlaygroundId
                            ? ""
                            : marker.id
                    )
                }
            />
        </div>
    );
}
