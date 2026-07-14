import type { SocialLinks } from "./socialLinks";

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
};