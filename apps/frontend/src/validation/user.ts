import { MAX_ABOUT_LENGTH } from "../constants/user";

/** Поле "О себе" необязательное, но ограничено по длине (UX-PROFILE §16). */
export function validateAbout(
    about: string
): string | null {
    if (about.length > MAX_ABOUT_LENGTH) {
        return `Описание не должно превышать ${MAX_ABOUT_LENGTH} символов.`;
    }

    return null;
}
