/**
 * Комментарий под комплексом (см. types/comment.ts — комментарии
 * дневника устроены так же, но это отдельный тип: id комплекса —
 * строка из статичного каталога, а не числовая запись дневника).
 */
export type ComplexComment = {
    id: string;

    complexId: string;

    userId: string;

    text: string;

    createdAt: string;
};
