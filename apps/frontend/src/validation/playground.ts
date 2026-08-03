import type {
    NewPlayground,
} from "../types/newPlayground";

import type {
    ValidationResult,
    ValidationError,
} from "./index";

import {
    MAX_PLAYGROUND_PHOTOS,
} from "../constants/playgroundPhotos";

export function validatePlayground(
    playground: NewPlayground
): ValidationResult {

    const errors: ValidationError[] = [];

    if (
        playground.name.trim().length === 0
    ) {
        errors.push({
            field: "name",
            message: "Введите название площадки.",
        });
    }

    if (
        !playground.coordinates
    ) {
        errors.push({
            field: "coordinates",
            message: "Укажите местоположение площадки на карте.",
        });
    }

    if (
        playground.size.trim().length === 0
    ) {
        errors.push({
            field: "size",
            message: "Выберите размер площадки.",
        });
    }

    if (
        playground.surface.trim().length === 0
    ) {
        errors.push({
            field: "surface",
            message: "Выберите покрытие площадки.",
        });
    }

    if (
        playground.description.trim().length === 0
    ) {
        errors.push({
            field: "description",
            message: "Добавьте описание площадки.",
        });
    }

    if (
        playground.photos.length > MAX_PLAYGROUND_PHOTOS
    ) {
        errors.push({
            field: "photos",
            message: `Можно загрузить не более ${MAX_PLAYGROUND_PHOTOS} фотографий.`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}