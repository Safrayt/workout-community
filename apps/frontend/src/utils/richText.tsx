import type { ReactNode } from "react";

/**
 * Лёгкая разметка текста для записей дневника — НЕ HTML и НЕ полный
 * markdown, а специально ограниченный набор из четырёх приёмов:
 *
 *   **жирный**
 *   *курсив*
 *   __подчёркнутый__
 *   [текст ссылки](https://...)
 *
 * плюс автоматическое распознавание "голых" ссылок в тексте (как в
 * linkifyText.tsx — сюда её отдельно не подключаем, а переиспользуем
 * тот же приём: URL без разметки тоже становится кликабельным).
 *
 * Текст по-прежнему хранится в БД как обычная строка (никаких
 * изменений схемы) — RichTextToolbar сама оборачивает выделенный
 * текст нужными символами при клике на кнопку, но пользователь может
 * набрать разметку и руками, синтаксис совпадает с привычным
 * markdown для bold/italic/link, поэтому это не выглядит чем-то
 * незнакомым.
 *
 * Разметка не вкладывается друг в друга (например, *курсив* внутри
 * **жирного** не сработает) — сознательное упрощение ради простого и
 * предсказуемого парсера без рекурсии.
 *
 * Не HTML: парсер сам строит React-элементы (не
 * dangerouslySetInnerHTML), поэтому вставить произвольный HTML/скрипт
 * через это поле нельзя — тот же принцип безопасности, что и в
 * linkifyText.
 */
const MARKUP_REGEX = new RegExp(
    [
        // [текст](ссылка) — ссылка с собственным текстом
        String.raw`\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)`,
        // **жирный** — проверяем раньше *курсив*, иначе "**x**"
        // распознался бы как курсив с лишними звёздочками по бокам
        String.raw`\*\*([^*]+?)\*\*`,
        // __подчёркнутый__
        String.raw`__([^_]+?)__`,
        // *курсив*
        String.raw`\*([^*]+?)\*`,
        // голая ссылка без разметки — та же логика, что в linkifyText
        String.raw`((?:https?:\/\/|www\.)[^\s<>"')]+)`,
    ].join("|"),
    "g"
);

const TRAILING_PUNCTUATION_REGEX = /[.,!?;:'"»)\]]+$/;

function renderBareUrl(
    rawUrl: string,
    key: number
): { node: ReactNode; consumed: number; trailing: string } | null {
    let url = rawUrl;
    let trailing = "";

    const trailingMatch = url.match(TRAILING_PUNCTUATION_REGEX);

    if (trailingMatch) {
        trailing = trailingMatch[0];
        url = url.slice(0, url.length - trailing.length);
    }

    if (!url) {
        return null;
    }

    const href = url.startsWith("http") ? url : `https://${url}`;

    return {
        node: (
            <a
                key={`rt-${key}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
            >
                {url}
            </a>
        ),
        consumed: url.length,
        trailing,
    };
}

/**
 * Разбирает текст с разметкой (см. комментарий выше) в массив строк
 * и React-элементов — использовать вместо обычной строки как
 * children текстового блока.
 */
export function renderRichText(text: string): ReactNode[] {
    const parts: ReactNode[] = [];

    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    // У MARKUP_REGEX флаг "g" — состояние (lastIndex) сохраняется
    // между вызовами exec, сбрасываем перед каждым новым текстом.
    MARKUP_REGEX.lastIndex = 0;

    while ((match = MARKUP_REGEX.exec(text)) !== null) {
        const [
            whole,
            linkText,
            linkUrl,
            boldText,
            underlineText,
            italicText,
            bareUrl,
        ] = match;

        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (linkText !== undefined) {
            parts.push(
                <a
                    key={`rt-${key++}`}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                >
                    {linkText}
                </a>
            );
            lastIndex = match.index + whole.length;
            continue;
        }

        if (boldText !== undefined) {
            parts.push(<strong key={`rt-${key++}`}>{boldText}</strong>);
            lastIndex = match.index + whole.length;
            continue;
        }

        if (underlineText !== undefined) {
            parts.push(<u key={`rt-${key++}`}>{underlineText}</u>);
            lastIndex = match.index + whole.length;
            continue;
        }

        if (italicText !== undefined) {
            parts.push(<em key={`rt-${key++}`}>{italicText}</em>);
            lastIndex = match.index + whole.length;
            continue;
        }

        if (bareUrl !== undefined) {
            const rendered = renderBareUrl(bareUrl, key++);

            if (!rendered) {
                lastIndex = match.index + whole.length;
                continue;
            }

            parts.push(rendered.node);
            lastIndex = match.index + rendered.consumed;

            if (rendered.trailing) {
                parts.push(rendered.trailing);
                lastIndex += rendered.trailing.length;
            }
        }
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

/**
 * Убирает символы разметки, оставляя только текст — для мест, где
 * разметку не рендерим (короткое превью в карточке списка дневника):
 * там текст всё равно обрезается по количеству символов/строк, и
 * показывать половину "**жирного" с незакрытой звёздочкой было бы
 * некрасиво. Ссылка [текст](url) превращается просто в текст —
 * кликабельность в превью не нужна.
 */
export function stripRichTextMarkup(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
        .replace(/\*\*([^*]+?)\*\*/g, "$1")
        .replace(/__([^_]+?)__/g, "$1")
        .replace(/\*([^*]+?)\*/g, "$1");
}
