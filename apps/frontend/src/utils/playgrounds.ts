import type {
    Playground,
    PlaygroundSize,
    PlaygroundSurface,
    PlaygroundAmenities,
    PlaygroundEquipment,
} from "../types/playground";
import { findById } from "./collections";


export function getPlaygroundById(
    playgrounds: Playground[],
    id: string
) {
    return findById(
        playgrounds,
        id
    );
}


export function getPlaygroundSizeName(
    size: PlaygroundSize
) {
    switch (size) {
        case "small":
            return "Маленькая";

        case "medium":
            return "Средняя";

        case "large":
            return "Большая";
    }
}

export function getSurfaceName(
    surface: PlaygroundSurface
) {
    switch (surface) {
        case "rubber":
            return "Резиновое покрытие";

        case "asphalt":
            return "Асфальт";

        case "gravel":
            return "Гравий";

        case "mulch":
            return "Мульча";

        case "sand":
            return "Песок";

        case "ground":
            return "Земля";
    }
}


export function getAmenitiesList(
    amenities: PlaygroundAmenities
) {
    const result: string[] = [];

    if (amenities.lighting) {
        result.push("Освещение");
    }

    if (amenities.covered) {
        result.push("Навес");
    }

    if (amenities.changingRoom) {
        result.push("Раздевалка");
    }

    if (amenities.toilet) {
        result.push("Туалет");
    }

    if (amenities.drinkingWater) {
        result.push("Питьевая вода");
    }

    if (amenities.shower) {
        result.push("Душ");
    }

    if (amenities.parking) {
        result.push("Парковка");
    }

    if (amenities.bicycleParking) {
        result.push("Велопарковка");
    }

    return result;
}



export function getEquipmentName(
    equipment: PlaygroundEquipment
) {
    switch (equipment) {
        case "widePullBar":
            return "Широкий турник (>150 см)";

        case "highPullBar":
            return "Высокий турник (>200 см)";

        case "mediumPullBar":
            return "Средний турник (180–200 см)";

        case "lowPullBar":
            return "Низкий турник (160–180 см)";

        case "middlePushBar":
            return "Средняя перекладина (50–100 см)";

        case "lowPushBar":
            return "Низкая перекладина (<50 см)";

        case "labyrinth":
            return "Лабиринт";

        case "highParallelBars":
            return "Высокие брусья (>160 см)";

        case "mediumParallelBars":
            return "Средние брусья (140–160 см)";

        case "parallettes":
            return "Паралетсы (30–100 см)";

        case "pushUpBars":
            return "Упоры (<30 см)";

        case "wideMonkeyBars":
            return "Рукоход (широкий)";

        case "narrowMonkeyBars":
            return "Рукоход (узкий)";

        case "swedishWall":
            return "Шведская стенка";

        case "inclineBench":
            return "Наклонная скамья";

        case "posts":
            return "Столбики";

        case "rings":
            return "Кольца";

        case "rope":
            return "Канат";
    }
}

export function getPlaygroundOptions(
    playgrounds: Playground[]
) {
    return playgrounds.map(
        (playground) => ({
            value: playground.id,
            label: `${playground.name} • ${playground.locality} • ${playground.address}`,
        })
    );
}

export function getCreatedPlaygrounds(
    playgrounds: Playground[],
    creatorId: string
) {
    return playgrounds.filter(
        (playground) =>
            playground.creatorId === creatorId
    );
}

/**
 * Количество уникальных площадок, отмеченных в дневнике
 * пользователя — метрика "Площадок" в статистике профиля
 * (UX-PROFILE §14).
 */
export function getVisitedPlaygroundsCount(
    playgroundIds: (string | undefined)[]
) {
    const uniqueIds = new Set(
        playgroundIds.filter(
            (id): id is string => Boolean(id)
        )
    );

    return uniqueIds.size;
}