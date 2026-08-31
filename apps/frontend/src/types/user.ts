import type { SocialLinks } from "./socialLinks";
import type { PrivacySettings } from "./privacySettings";

export type User = {
    id: string;

    nickname: string;

    bio: string;

    avatarUrl?: string;

    experience: number;

    createdAt: string;

    socialLinks: SocialLinks;

    privacySettings: PrivacySettings;

    /**
     * Модератор портала — может редактировать/удалять чужие площадки
     * и мероприятия, удалять чужие отзывы. Назначается только через
     * базу данных на сервере (см. DEPLOY.md), через сам сайт этим
     * полем управлять нельзя.
     */
    isAdmin: boolean;
};