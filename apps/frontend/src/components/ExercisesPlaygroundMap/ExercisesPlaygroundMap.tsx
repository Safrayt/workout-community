import { useMemo, useState } from "react";

import PlaygroundsMap from "../Map/PlaygroundsMap";

import type { Playground } from "../../types/playground";

import { EURASIA_MAP_CENTER, EURASIA_MAP_ZOOM } from "../../constants/map";
import { getPlaygroundMarkers } from "../../utils/maps";

type ExercisesPlaygroundMapProps = {
    playgrounds: Playground[];

    /** Выбранная площадка (пустая строка — не выбрана). */
    selectedPlaygroundId: string;

    /** Клик по метке: страница сама решает, выбрать площадку или снять выбор. */
    onSelectPlayground: (playgroundId: string) => void;
};

/**
 * Карта площадок для фильтра упражнений: клик по метке выбирает
 * площадку. Если при появлении карты площадка уже выбрана (ссылка с
 * её страницы или переключение с карты мышц), карта один раз
 * приближается к ней и открывает её окошко; дальнейшие клики по
 * меткам карту не двигают — площадка уже видна на экране.
 */
export default function ExercisesPlaygroundMap({
    playgrounds,
    selectedPlaygroundId,
    onSelectPlayground,
}: ExercisesPlaygroundMapProps) {
    const markers = useMemo(
        () => getPlaygroundMarkers(playgrounds),
        [playgrounds]
    );

    // Выбор на момент появления карты (компонент размонтируется при
    // переключении на карту мышц и создаётся заново при возврате).
    const [initialPlaygroundId] = useState(selectedPlaygroundId);

    const initialPlayground = playgrounds.find(
        (playground) => playground.id === initialPlaygroundId
    );

    return (
        <PlaygroundsMap
            markers={markers}
            height="420px"
            selectedMarkerId={selectedPlaygroundId || undefined}
            focusMarkerId={initialPlayground?.id}
            onMarkerClick={(marker) => onSelectPlayground(marker.id)}
            detailsLinkLabel="Страница площадки"
            openDetailsInNewTab
            initialCenter={
                initialPlayground
                    ? [
                          initialPlayground.coordinates.latitude,
                          initialPlayground.coordinates.longitude,
                      ]
                    : EURASIA_MAP_CENTER
            }
            initialZoom={initialPlayground ? 12 : EURASIA_MAP_ZOOM}
        />
    );
}
