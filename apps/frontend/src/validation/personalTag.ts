import type { PersonalTag } from "../types/personalTag";

import {
    normalizeTagName,
    isTagNameTaken,
} from "../utils/personalTags";

import {
    MAX_TAG_NAME_LENGTH,
} from "../constants/personalTags";

export function validateTagName(
    name: string,
    tags: PersonalTag[],
    userId: string,
    excludeId?: string
): string | null {
    const trimmed = normalizeTagName(name);

    if (trimmed.length === 0) {
        return "Введите название тега.";
    }

    if (trimmed.length > MAX_TAG_NAME_LENGTH) {
        return `Название тега не должно превышать ${MAX_TAG_NAME_LENGTH} символов.`;
    }

    if (
        isTagNameTaken(tags, userId, trimmed, excludeId)
    ) {
        return `Тег «${trimmed}» уже существует.`;
    }

    return null;
}
