import PlaygroundsMap from "../Map/PlaygroundsMap";

import type { DiaryRecord } from "../../types/diaryRecord";
import type { Playground } from "../../types/playground";

import {
    getEntryCountsByPlayground,
    getPlaygroundsWithEntries,
    getWorkoutPlaygroundIds,
} from "../../utils/diaryFilters";

import { pluralizeRu } from "../../utils/pluralize";

import "../../styles/components/diary-map.css";

type DiaryMapProps = {

    records: DiaryRecord[];

    playgrounds: Playground[];

    selectedPlaygroundId: string;

    onSelectPlayground: (playgroundId: string) => void;

};

// Совпадает с тонами "Отличная"/"Хорошая" из constants/playgroundRating.ts
// — те же оттенки, что человек уже видит на карте всех площадок,
// но здесь означают другое: не рейтинг, а тип записи.
const WORKOUT_MARKER_COLOR = "#38a169";
const NOTE_ONLY_MARKER_COLOR = "#d69e2e";

/**
 * "География тренировок" (UX-DIARY §6–10; UX-DIARY-V2 §11): карта
 * показывает не все площадки платформы, а только те, с которыми
 * связана хоть одна запись пользователя — тренировка или заметка.
 * Клик по метке сразу фильтрует список — отдельная кнопка
 * "Показать" не нужна (§8).
 *
 * Цвет метки зависит от типа записи, а не от рейтинга площадки:
 * зелёный — есть хотя бы одна тренировка, жёлтый — только заметки.
 */
export default function DiaryMap({
    records,
    playgrounds,
    selectedPlaygroundId,
    onSelectPlayground,
}: DiaryMapProps) {
    const visitedPlaygrounds =
        getPlaygroundsWithEntries(
            records,
            playgrounds
        );

    const entryCounts =
        getEntryCountsByPlayground(records);

    const workoutPlaygroundIds =
        getWorkoutPlaygroundIds(records);

    const markers = visitedPlaygrounds.map(
        (playground) => {
            const count = entryCounts[playground.id] ?? 0;

            return {
                id: playground.id,
                title: playground.name,
                latitude: playground.coordinates.latitude,
                longitude: playground.coordinates.longitude,
                url: `/playgrounds/${playground.id}`,
                locality: playground.locality,
                color: workoutPlaygroundIds.has(playground.id)
                    ? WORKOUT_MARKER_COLOR
                    : NOTE_ONLY_MARKER_COLOR,
                shortInfo:
                    `${count} ${pluralizeRu(count, ["запись", "записи", "записей"])}`,
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
