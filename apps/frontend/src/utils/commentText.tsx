import type { ReactNode } from "react";

import { linkifyText } from "./linkifyText";

/**
 * Упоминание пользователя в комментарии: «@ник». Допустимые символы и
 * длина ника — те же, что у сервера, когда он рассылает уведомления об
 * упоминаниях (MENTION_REGEX в backend/app/notifications.py). Перед
 * «@» должно быть начало строки или не буква/цифра — иначе адрес
 * электронной почты «name@example.com» выглядел бы как упоминание.
 */
const MENTION_PATTERN =
    "(^|[^A-Za-zА-Яа-яЁё0-9_])(@[A-Za-zА-Яа-яЁё0-9_\\-.]{2,32})";

/** Точка или дефис в конце — знак препинания предложения, а не часть
 *  ника: «Спасибо, @vasya.» выделяет «@vasya». */
const TRAILING_PUNCTUATION = /[.\-]+$/;

/** Короче этого (вместе с «@») упоминанием не считается. */
const MIN_MENTION_LENGTH = 3;

function boldMentions(text: string, keyPrefix: string): ReactNode[] {
    // Новое выражение на каждый вызов: у регулярок с флагом "g"
    // есть состояние между вызовами exec.
    const pattern = new RegExp(MENTION_PATTERN, "g");
    const parts: ReactNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const mention = match[2].replace(TRAILING_PUNCTUATION, "");

        if (mention.length < MIN_MENTION_LENGTH) {
            continue;
        }

        const mentionStart = match.index + match[1].length;

        if (mentionStart > lastIndex) {
            parts.push(text.slice(lastIndex, mentionStart));
        }

        parts.push(
            <strong key={`${keyPrefix}-mention-${mentionStart}`}>
                {mention}
            </strong>
        );

        lastIndex = mentionStart + mention.length;

        // Знаки препинания, отрезанные от ника, остаются обычным
        // текстом и не должны попасть в следующее совпадение.
        pattern.lastIndex = lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

/**
 * Текст комментария для показа: ссылки становятся кликабельными
 * (linkifyText), а упоминания «@ник» выделяются жирным шрифтом.
 * Упоминания внутри ссылок не трогаем.
 */
export function renderCommentText(text: string): ReactNode[] {
    return linkifyText(text).flatMap((part, index) =>
        typeof part === "string" ? boldMentions(part, String(index)) : [part]
    );
}
