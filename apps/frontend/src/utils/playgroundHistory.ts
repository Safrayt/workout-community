import type {
    Playground,
    PlaygroundHistoryEntry,
} from "../types/playground";

import type { NewPlayground } from "../types/newPlayground";

function areEquipmentListsEqual(
    a: Playground["equipment"],
    b: Playground["equipment"]
) {
    if (a.length !== b.length) {
        return false;
    }

    const setA = new Set(a);

    return b.every((item) => setA.has(item));
}

function areAmenitiesEqual(
    a: Playground["amenities"],
    b: Playground["amenities"]
) {
    return (
        Object.keys(a) as (keyof Playground["amenities"])[]
    ).every((key) => a[key] === b[key]);
}

/**
 * Сравнивает сохранённую площадку с данными формы и возвращает
 * человекочитаемый список изменившихся полей — для записи "Изменена"
 * в истории площадки.
 */
export function getChangedFields(
    existing: Playground,
    updated: NewPlayground
): string[] {

    const changes: string[] = [];

    if (existing.name !== updated.name) {
        changes.push("Название");
    }

    if (existing.locality !== updated.locality) {
        changes.push("Населённый пункт");
    }

    if (existing.address !== updated.address) {
        changes.push("Адрес");
    }

    if (
        updated.coordinates &&
        (
            existing.coordinates.latitude !== updated.coordinates.latitude ||
            existing.coordinates.longitude !== updated.coordinates.longitude
        )
    ) {
        changes.push("Координаты");
    }

    if (
        updated.size &&
        existing.size !== updated.size
    ) {
        changes.push("Размер");
    }

    if (
        updated.surface &&
        existing.surface !== updated.surface
    ) {
        changes.push("Покрытие");
    }

    if (
        updated.access &&
        existing.access !== updated.access
    ) {
        changes.push("Доступ");
    }

    if (
        (existing.accessRestrictions ?? "") !==
        (updated.access === "limited" ? updated.accessRestrictions : "")
    ) {
        changes.push("Ограничения доступа");
    }

    if (
        updated.condition &&
        existing.condition !== updated.condition
    ) {
        changes.push("Состояние");
    }

    if (
        !areEquipmentListsEqual(existing.equipment, updated.equipment)
    ) {
        changes.push("Оборудование");
    }

    if (
        !areAmenitiesEqual(existing.amenities, updated.amenities)
    ) {
        changes.push("Удобства");
    }

    if (
        updated.openingHours.trim().length > 0 &&
        existing.openingHours !== updated.openingHours
    ) {
        changes.push("Время работы");
    }

    if (existing.description !== updated.description) {
        changes.push("Описание");
    }

    if (existing.photos.length !== updated.photos.length) {
        changes.push("Фотографии");
    }

    return changes;

}

/**
 * Последняя запись в истории, которая подтверждает актуальность
 * данных, — это либо добавление площадки, либо проверка.
 * Правки ("edit") сами по себе актуальность не подтверждают.
 */
export function getLastVerification(
    playground: Playground
): PlaygroundHistoryEntry | undefined {

    const verifications = playground.history.filter(
        (entry) => entry.type === "created" || entry.type === "inspection"
    );

    return verifications[verifications.length - 1];

}
