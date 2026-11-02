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

import { MAX_MANUFACTURER_NAME_LENGTH } from "../constants/playgroundManufacturer";
import { normalizeWebsiteUrl } from "../utils/websiteUrl";

export function validatePlayground(
    playground: NewPlayground,
    options: { isEditing?: boolean } = {}
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
        playground.access.trim().length === 0
    ) {
        errors.push({
            field: "access",
            message: "Укажите доступ к площадке.",
        });
    }

    if (
        playground.access === "limited" &&
        playground.accessRestrictions.trim().length === 0
    ) {
        errors.push({
            field: "accessRestrictions",
            message: "Опишите, в чём заключаются ограничения доступа.",
        });
    }

    if (
        playground.condition.trim().length === 0
    ) {
        errors.push({
            field: "condition",
            message: "Укажите состояние площадки.",
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

    const manufacturerName = playground.manufacturerName.trim();
    const manufacturerUrl = playground.manufacturerUrl.trim();

    if (manufacturerName.length > MAX_MANUFACTURER_NAME_LENGTH) {
        errors.push({
            field: "manufacturerName",
            message: `Название производителя — не длиннее ${MAX_MANUFACTURER_NAME_LENGTH} символов.`,
        });
    }

    if (manufacturerUrl.length > 0) {
        if (manufacturerName.length === 0) {
            errors.push({
                field: "manufacturerName",
                message:
                    "Укажите название производителя, чтобы добавить ссылку на его сайт.",
            });
        }

        if (normalizeWebsiteUrl(manufacturerUrl) === null) {
            errors.push({
                field: "manufacturerUrl",
                message: "Введите корректную ссылку, например https://example.com.",
            });
        }
    }

    if (
        !options.isEditing &&
        playground.photos.length === 0
    ) {
        errors.push({
            field: "photos",
            message: "Добавьте хотя бы одну фотографию площадки.",
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