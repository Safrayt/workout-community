import type { ReactNode } from "react";

/**
 * Находит ссылки в свободном тексте: с протоколом (http://, https://)
 * и без него, если текст начинается с "www." — пользователи часто
 * пишут ссылки именно так, не задумываясь о протоколе.
 */
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"')]+)/gi;

/**
 * Знаки препинания в конце найденной ссылки не считаем её частью —
 * иначе "Го тренить, вот площадка: http://example.com." сделал бы
 * точку в конце предложения частью ссылки.
 */
const TRAILING_PUNCTUATION_REGEX = /[.,!?;:'"»)\]]+$/;

/**
 * Превращает обычные URL в тексте записи (тренировки, заметки) в
 * кликабельные ссылки, открывающиеся в новой вкладке. Возвращает
 * массив строк и React-элементов — использовать вместо обычной
 * строки как children текстового блока.
 *
 * Не HTML и не markdown — просто автоматическое распознавание
 * "голых" ссылок в свободном тексте, без разметки [текст](ссылка).
 */
export function linkifyText(text: string): ReactNode[] {
    const parts: ReactNode[] = [];

    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    // Регулярное выражение — общий модуль-уровневый объект с флагом
    // "g", у него есть внутреннее состояние (lastIndex) между
    // вызовами exec — обязательно сбрасываем перед каждым новым
    // текстом, иначе поиск может начаться не с начала строки.
    URL_REGEX.lastIndex = 0;

    while ((match = URL_REGEX.exec(text)) !== null) {
        const matchStart = match.index;
        let url = match[0];

        const trailingMatch = url.match(TRAILING_PUNCTUATION_REGEX);
        let trailing = "";

        if (trailingMatch) {
            trailing = trailingMatch[0];
            url = url.slice(0, url.length - trailing.length);
        }

        if (!url) {
            continue;
        }

        if (matchStart > lastIndex) {
            parts.push(text.slice(lastIndex, matchStart));
        }

        const href = url.startsWith("http") ? url : `https://${url}`;

        parts.push(
            <a
                key={`link-${key++}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                // На случай, если текст с ссылкой когда-нибудь
                // окажется внутри кликабельной карточки — клик по
                // самой ссылке не должен также срабатывать как клик
                // по карточке.
                onClick={(event) => event.stopPropagation()}
            >
                {url}
            </a>
        );

        lastIndex = matchStart + url.length;

        if (trailing) {
            parts.push(trailing);
            lastIndex += trailing.length;
        }
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}
