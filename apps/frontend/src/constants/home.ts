/** Скользящее окно для карты "Активность на площадках" (UX-HOME §5). */
export const HOME_ACTIVITY_WINDOW_HOURS = 24;

/**
 * Максимум записей одного пользователя в Home Feed за один
 * календарный день публикации (UX-HOME §15, §16).
 */
export const HOME_FEED_DAILY_USER_LIMIT = 3;

/** Размер одной "страницы" ленты при нажатии "Загрузить ещё" (UX-HOME §25). */
export const HOME_FEED_PAGE_SIZE = 10;

/** localStorage-ключ состояния сворачивания карты (UX-HOME §10). */
export const HOME_ACTIVITY_MAP_COLLAPSED_KEY = "home.activityMap.collapsed";

/**
 * Цвета маркеров карты активности. Workout имеет приоритет над
 * Note — если на площадке есть и то, и другое, маркер зелёный
 * (UX-HOME §7).
 */
export const HOME_ACTIVITY_MARKER_COLORS = {
    workout: "#38a169",
    note: "#d69e2e",
} as const;
