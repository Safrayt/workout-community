export function findById<
    T extends { id: string }
>(
    items: T[],
    id: string
) {
    return items.find(
        (item) =>
            item.id === id
    );
}