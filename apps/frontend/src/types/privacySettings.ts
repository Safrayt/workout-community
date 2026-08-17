/**
 * Настройки видимости разделов профиля для посторонних
 * пользователей. На собственный просмотр профиля не влияют —
 * владелец всегда видит все свои разделы (UX-PROFILE, "Настройки
 * аккаунта").
 */
export type PrivacySettings = {
    diaryVisible: boolean;

    achievementsVisible: boolean;

    /** Видимость событий, в которых пользователь участвует (не организатор). */
    eventsVisible: boolean;

    subscriptionsVisible: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    diaryVisible: true,
    achievementsVisible: true,
    eventsVisible: true,
    subscriptionsVisible: true,
};
