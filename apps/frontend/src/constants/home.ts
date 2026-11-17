/** Скользящее окно для карты "Активность на площадках" (UX-HOME §5). */
export const HOME_ACTIVITY_WINDOW_HOURS = 24 * 7;

/**
 * Максимум записей одного пользователя в Home Feed за один
 * календарный день публикации (UX-HOME §15, §16).
 */
export const HOME_FEED_DAILY_USER_LIMIT = 3;

/** Размер одной "страницы" ленты при нажатии "Загрузить ещё" (UX-HOME §25). */
export const HOME_FEED_PAGE_SIZE = 10;

/**
 * Сколько записей показано в ленте сразу, пока не нажали "Загрузить
 * ещё", на десктопе — в два раза больше обычной страницы: в три колонки
 * десять карточек — это всего три-четыре ряда. Десктоп — ширина от
 * 1200px (три колонки, как в home-feed.css); на планшете и телефоне
 * лента сразу показывает обычную страницу.
 */
export const HOME_FEED_DESKTOP_INITIAL_SIZE = HOME_FEED_PAGE_SIZE * 2;
export const HOME_FEED_DESKTOP_MEDIA_QUERY = "(min-width: 1200px)";

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
