/**
 * Карусель картинок в тексте статьи — это обычный Markdown-блок с
 * "языком" carousel, внутри которого лежат обычные картинки:
 *
 * ```carousel
 * ![описание](/uploads/articles/<32 hex>.jpg)
 * ![описание](/uploads/articles/<32 hex>.png)
 * ```
 *
 * Бэкенду ничего знать о карусели не нужно: он и так проверяет каждую
 * ![](...) в тексте и по адресам находит картинки, которые нельзя
 * удалять с диска. А там, где блок не умеют рисовать, он выглядит как
 * обычный блок кода со списком картинок — ничего не ломается.
 */

export const CAROUSEL_LANGUAGE = "carousel";

/** Сколько картинок можно добавить в карусель за один раз. */
export const MAX_CAROUSEL_IMAGES = 10;

export type CarouselImage = {
    src: string;
    alt: string;
};

/** ![описание](адрес "подсказка") — берём описание и адрес. */
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)[^)]*\)/g;

/** Достаёт картинки из текста внутри блока carousel. */
export function parseCarouselSource(source: string): CarouselImage[] {
    return Array.from(source.matchAll(MARKDOWN_IMAGE), (match) => ({
        alt: match[1],
        src: match[2],
    }));
}

/** Собирает Markdown-блок карусели из загруженных картинок. */
export function buildCarouselBlock(images: CarouselImage[]): string {
    const lines = images.map((image) => `![${image.alt}](${image.src})`);

    return ["```" + CAROUSEL_LANGUAGE, ...lines, "```"].join("\n");
}
