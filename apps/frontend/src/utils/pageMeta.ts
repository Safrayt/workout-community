import { SITE_DESCRIPTION, SITE_NAME } from "../constants/site";

/** Сколько символов описания обычно показывает поисковая выдача. */
const MAX_DESCRIPTION_LENGTH = 160;

export type PageMeta = {
    /** Название страницы; к нему добавляется название сайта. */
    title?: string;

    /** Описание страницы для поисковой выдачи и ссылок. */
    description?: string;
};

/** «Название страницы — Street-workout.online»; без названия — только сайт. */
export function formatPageTitle(title?: string): string {
    const clean = title?.trim();

    return clean ? `${clean} — ${SITE_NAME}` : SITE_NAME;
}

/**
 * Описание для <meta name="description"> из текста страницы: убирает
 * разметку и переносы строк, склеивает части и обрезает до разумной
 * длины по границе слова. Пустые части пропускаются.
 */
export function makeDescription(
    ...parts: (string | null | undefined)[]
): string {
    const text = parts
        .filter((part): part is string => Boolean(part))
        .join(" ")
        .replace(/<[^>]*>/g, " ")
        .replace(/[*_#>`~]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length <= MAX_DESCRIPTION_LENGTH) {
        return text;
    }

    const cut = text.slice(0, MAX_DESCRIPTION_LENGTH - 1);
    const lastSpace = cut.lastIndexOf(" ");

    return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}

function getDescriptionElement(): HTMLMetaElement {
    let element = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
    );

    if (!element) {
        element = document.createElement("meta");
        element.name = "description";
        document.head.appendChild(element);
    }

    return element;
}

/**
 * Выставляет заголовок вкладки и описание страницы. Возвращает функцию,
 * которая возвращает значения по умолчанию, — её нужно вызвать при
 * уходе со страницы (cleanup эффекта): тогда страница без собственного
 * заголовка не останется с чужим.
 */
export function applyPageMeta({ title, description }: PageMeta): () => void {
    document.title = formatPageTitle(title);
    getDescriptionElement().content = description || SITE_DESCRIPTION;

    return () => {
        document.title = SITE_NAME;
        getDescriptionElement().content = SITE_DESCRIPTION;
    };
}
