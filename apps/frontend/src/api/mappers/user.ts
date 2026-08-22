import type { User } from "../../types/user";
import type { SocialLinks } from "../../types/socialLinks";
import type { PrivacySettings } from "../../types/privacySettings";

/**
 * Форма ответа бэкенда для пользователя (см. UserRead в
 * app/models.py). Поля social_* и *_visible там плоские — на
 * фронтенде это вложенные socialLinks/privacySettings, поэтому
 * нужен явный маппинг в обе стороны, а не прямая подстановка ответа
 * API как есть.
 */
export type ApiUser = {
    id: number;
    name: string;
    nickname: string;
    locality: string;
    bio: string;
    avatar_url: string | null;
    experience: number;
    created_at: string;
    social_telegram: string | null;
    social_vk: string | null;
    social_whatsapp: string | null;
    social_signal: string | null;
    social_instagram: string | null;
    social_youtube: string | null;
    social_github: string | null;
    social_website: string | null;
    diary_visible: boolean;
    achievements_visible: boolean;
    events_visible: boolean;
    subscriptions_visible: boolean;
};

function omitUndefined(
    value: string | null
): string | undefined {
    return value ?? undefined;
}

export function mapApiUserToUser(apiUser: ApiUser): User {
    const socialLinks: SocialLinks = {
        telegram: omitUndefined(apiUser.social_telegram),
        vk: omitUndefined(apiUser.social_vk),
        whatsapp: omitUndefined(apiUser.social_whatsapp),
        signal: omitUndefined(apiUser.social_signal),
        instagram: omitUndefined(apiUser.social_instagram),
        youtube: omitUndefined(apiUser.social_youtube),
        github: omitUndefined(apiUser.social_github),
        website: omitUndefined(apiUser.social_website),
    };

    const privacySettings: PrivacySettings = {
        diaryVisible: apiUser.diary_visible,
        achievementsVisible: apiUser.achievements_visible,
        eventsVisible: apiUser.events_visible,
        subscriptionsVisible: apiUser.subscriptions_visible,
    };

    return {
        id: String(apiUser.id),
        name: apiUser.name,
        nickname: apiUser.nickname,
        locality: apiUser.locality,
        bio: apiUser.bio,
        avatarUrl: apiUser.avatar_url ?? undefined,
        experience: apiUser.experience,
        createdAt: apiUser.created_at,
        socialLinks,
        privacySettings,
    };
}

/**
 * Патч для PUT /users/me. Принимает частичный User "как на
 * фронтенде" (в т.ч. вложенные socialLinks/privacySettings) и
 * разворачивает его обратно в плоские поля, которые ожидает
 * UserUpdate на бэкенде. Только реально переданные поля попадают
 * в результат — exclude_unset на бэкенде полагается именно на это.
 */
export function mapUserPatchToApi(
    patch: Partial<User>
): Record<string, unknown> {
    const apiPatch: Record<string, unknown> = {};

    if (patch.name !== undefined) apiPatch.name = patch.name;
    if (patch.locality !== undefined) apiPatch.locality = patch.locality;
    if (patch.bio !== undefined) apiPatch.bio = patch.bio;

    if (patch.avatarUrl !== undefined) {
        apiPatch.avatar_url = patch.avatarUrl || null;
    }

    if (patch.socialLinks !== undefined) {
        const links = patch.socialLinks;
        apiPatch.social_telegram = links.telegram || null;
        apiPatch.social_vk = links.vk || null;
        apiPatch.social_whatsapp = links.whatsapp || null;
        apiPatch.social_signal = links.signal || null;
        apiPatch.social_instagram = links.instagram || null;
        apiPatch.social_youtube = links.youtube || null;
        apiPatch.social_github = links.github || null;
        apiPatch.social_website = links.website || null;
    }

    if (patch.privacySettings !== undefined) {
        const privacy = patch.privacySettings;
        apiPatch.diary_visible = privacy.diaryVisible;
        apiPatch.achievements_visible = privacy.achievementsVisible;
        apiPatch.events_visible = privacy.eventsVisible;
        apiPatch.subscriptions_visible = privacy.subscriptionsVisible;
    }

    return apiPatch;
}
