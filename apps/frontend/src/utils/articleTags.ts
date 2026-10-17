/** Должны совпадать с MAX_TAGS и MAX_TAG_LENGTH в app/models_article.py. */
export const MAX_ARTICLE_TAGS = 10;
export const MAX_ARTICLE_TAG_LENGTH = 30;

export type ArticleTagResult =
    | { ok: true; tag: string }
    | { ok: false; error: string };

/**
 * Приводит введённый хештег к виду, который хранит сервер (то же делает
 * normalize_tag в app/models_article.py): "  #Широким хватом " →
 * "широким-хватом". Регистр не различается — иначе "Питание" и "питание"
 * были бы двумя тегами.
 */
export function normalizeArticleTag(raw: string): ArticleTagResult {
    const tag = raw
        .trim()
        .replace(/^#+/, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    if (!tag) {
        return { ok: false, error: "Введите хештег" };
    }

    if (tag.length > MAX_ARTICLE_TAG_LENGTH) {
        return {
            ok: false,
            error: `Хештег не длиннее ${MAX_ARTICLE_TAG_LENGTH} символов`,
        };
    }

    if (!/^[\p{L}\p{N}_-]+$/u.test(tag)) {
        return {
            ok: false,
            error: "В хештеге допустимы только буквы, цифры, «-» и «_»",
        };
    }

    return { ok: true, tag };
}
