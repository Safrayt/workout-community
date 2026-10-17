/**
 * Чистые функции правки Markdown-текста для кнопок редактора статей
 * (components/MarkdownEditor). Каждая получает текст и границы выделения
 * (как selectionStart/selectionEnd у textarea) и возвращает новый текст
 * с новым выделением — DOM здесь не трогаем, поэтому их легко проверять.
 */

export type TextEdit = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};

/**
 * Оборачивает выделенное в разметку (**жирный**, *курсив*). Пробелы по
 * краям выделения остаются снаружи: "** слово **" Markdown не считает
 * выделением. Если ничего не выделено, вставляет подсказку-заготовку и
 * выделяет её, чтобы её можно было сразу заменить своим текстом.
 */
export function wrapSelection(
    value: string,
    start: number,
    end: number,
    before: string,
    after: string,
    placeholder: string
): TextEdit {
    let from = start;
    let to = end;

    while (from < to && /\s/.test(value[from])) {
        from++;
    }

    while (to > from && /\s/.test(value[to - 1])) {
        to--;
    }

    const inner = value.slice(from, to) || placeholder;

    return {
        value: value.slice(0, from) + before + inner + after + value.slice(to),
        selectionStart: from + before.length,
        selectionEnd: from + before.length + inner.length,
    };
}

/** Границы строк, которых касается выделение. */
function lineRange(value: string, start: number, end: number) {
    const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;

    // Выделение целых строк обычно заканчивается сразу после "\n" — то
    // есть в начале следующей строки, которую трогать не нужно.
    const effectiveEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;

    const newline = value.indexOf("\n", effectiveEnd);

    return {
        lineStart,
        lineEnd: newline === -1 ? value.length : newline,
    };
}

function transformLines(
    value: string,
    start: number,
    end: number,
    transform: (lines: string[]) => string[]
): TextEdit {
    const { lineStart, lineEnd } = lineRange(value, start, end);

    const lines = value.slice(lineStart, lineEnd).split("\n");
    const next = transform(lines).join("\n");

    return {
        value: value.slice(0, lineStart) + next + value.slice(lineEnd),
        // Без выделения курсор остаётся в конце строки, а не
        // превращается в выделение всей строки.
        selectionStart: start === end ? lineStart + next.length : lineStart,
        selectionEnd: lineStart + next.length,
    };
}

const isFilled = (line: string) => line.trim() !== "";

const HEADING_MARKER = /^#{1,6}\s+/;
const BULLET_MARKER = /^\s{0,3}[-*+]\s+/;
const ORDERED_MARKER = /^\s{0,3}\d+[.)]\s+/;
const QUOTE_MARKER = /^\s{0,3}>\s?/;
const ANY_LIST_MARKER = /^\s{0,3}(?:[-*+]|\d+[.)])\s+/;

/**
 * Заголовок раздела: "## " или "### ". Повторное нажатие на тот же
 * уровень убирает заголовок, нажатие на другой — меняет уровень.
 */
export function toggleHeading(
    value: string,
    start: number,
    end: number,
    level: 2 | 3
): TextEdit {
    const prefix = `${"#".repeat(level)} `;

    return transformLines(value, start, end, (lines) => {
        const filled = lines.filter(isFilled);
        const alreadyHeading =
            filled.length > 0 && filled.every((line) => line.startsWith(prefix));

        if (alreadyHeading) {
            return lines.map((line) =>
                line.startsWith(prefix) ? line.slice(prefix.length) : line
            );
        }

        return lines.map((line) =>
            isFilled(line) ? prefix + line.replace(HEADING_MARKER, "") : line
        );
    });
}

function toggleLinePrefix(
    value: string,
    start: number,
    end: number,
    prefixFor: (position: number) => string,
    marker: RegExp,
    markersToStrip: RegExp
): TextEdit {
    return transformLines(value, start, end, (lines) => {
        const filled = lines.filter(isFilled);
        const alreadyMarked =
            filled.length > 0 && filled.every((line) => marker.test(line));

        if (alreadyMarked) {
            return lines.map((line) => line.replace(marker, ""));
        }

        // Пустые строки (границы абзацев) остаются как есть, а
        // нумерация идёт только по строкам с текстом.
        let position = 0;

        return lines.map((line) => {
            if (!isFilled(line)) {
                return line;
            }

            position++;

            return prefixFor(position) + line.replace(markersToStrip, "");
        });
    });
}

export function toggleBulletList(value: string, start: number, end: number) {
    return toggleLinePrefix(
        value,
        start,
        end,
        () => "- ",
        BULLET_MARKER,
        ANY_LIST_MARKER
    );
}

export function toggleNumberedList(value: string, start: number, end: number) {
    return toggleLinePrefix(
        value,
        start,
        end,
        (position) => `${position}. `,
        ORDERED_MARKER,
        ANY_LIST_MARKER
    );
}

export function toggleQuote(value: string, start: number, end: number) {
    return toggleLinePrefix(
        value,
        start,
        end,
        () => "> ",
        QUOTE_MARKER,
        QUOTE_MARKER
    );
}

/**
 * Вставляет отдельный блок (картинку) в свой абзац: если курсор стоит
 * посреди строки, блок отделяется от текста пустыми строками. selection —
 * какую часть вставленного блока выделить (смещения внутри блока).
 */
export function insertBlock(
    value: string,
    start: number,
    end: number,
    block: string,
    selection: [number, number] = [block.length, block.length]
): TextEdit {
    const before = value.slice(0, start);
    const after = value.slice(end);

    const lead =
        before === "" || before.endsWith("\n\n")
            ? ""
            : before.endsWith("\n")
              ? "\n"
              : "\n\n";

    const trail =
        after === "" || after.startsWith("\n\n")
            ? ""
            : after.startsWith("\n")
              ? "\n"
              : "\n\n";

    const blockStart = before.length + lead.length;

    return {
        value: before + lead + block + trail + after,
        selectionStart: blockStart + selection[0],
        selectionEnd: blockStart + selection[1],
    };
}

/** Ссылка [текст](адрес): выделенный текст становится её подписью. */
export function insertLink(
    value: string,
    start: number,
    end: number,
    url: string
): TextEdit {
    const text = value.slice(start, end) || "текст ссылки";

    return {
        value: `${value.slice(0, start)}[${text}](${url})${value.slice(end)}`,
        selectionStart: start + 1,
        selectionEnd: start + 1 + text.length,
    };
}

/**
 * Приводит введённый адрес к виду, безопасному внутри [текст](адрес):
 * "t.me/club" → "https://t.me/club", пробелы и скобки кодируются (иначе
 * они обрывают ссылку). Пустой ввод → null.
 */
export function normalizeLinkUrl(raw: string): string | null {
    const trimmed = raw.trim();

    if (!trimmed) {
        return null;
    }

    const withScheme = /^(?:https?:|mailto:|tel:|\/)/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    return withScheme
        .replace(/\s/g, "%20")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29");
}
