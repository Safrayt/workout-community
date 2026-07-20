import type {
    PlaygroundSize,
    PlaygroundSurface,
} from "../types/playground";

import { playgrounds } from "../data/playgrounds";


export function getPlaygroundById(
    id: string
) {
    return playgrounds.find(
        (playground) => playground.id === id
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