export const MAX_DESCRIPTION_PREVIEW_LINES = 5;

export function getDescriptionPreview(
    description: string,
    maxLines: number = MAX_DESCRIPTION_PREVIEW_LINES
) {
    const lines = description.split("\n");

    if (lines.length <= maxLines) {
        return description;
    }

    return [
        ...lines.slice(0, maxLines - 1),
        "...",
    ].join("\n");
}