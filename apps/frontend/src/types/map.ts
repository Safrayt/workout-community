export type MapMarker = {
    id: string;

    title: string;

    latitude: number;

    longitude: number;

    url: string;

    photoUrl?: string;

    /** Населённый пункт площадки — показывается под названием в popup. */
    locality?: string;

    /** Цвет метки на карте (например, по уровню рейтинга площадки). */
    color?: string;

    /** Рейтинг площадки (0–100) — для бейджа в popup. */
    rating?: number;

    /** Краткая характеристика для popup, например "17 эл. · L · Резина". */
    shortInfo?: string;
};