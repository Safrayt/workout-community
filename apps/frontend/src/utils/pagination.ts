export const DEFAULT_PAGE_SIZE = 7;

export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number = DEFAULT_PAGE_SIZE
) {
    const start = (page - 1) * pageSize;

    return items.slice(
        start,
        start + pageSize
    );
}

export function getTotalPages(
    totalItems: number,
    pageSize: number = DEFAULT_PAGE_SIZE
) {
    return Math.max(
        1,
        Math.ceil(totalItems / pageSize)
    );
}