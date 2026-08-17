import type { SocialLinks } from "./socialLinks";
import type { PrivacySettings } from "./privacySettings";

export type User = {
    id: string;

    name: string;

    nickname: string;

    locality: string;

    bio: string;

    avatarUrl?: string;

    experience: number;

    createdAt: string;

    socialLinks: SocialLinks;

    privacySettings: PrivacySettings;
};