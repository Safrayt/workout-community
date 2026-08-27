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
};