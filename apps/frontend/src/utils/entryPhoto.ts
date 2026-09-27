import type { Playground } from "../types/playground";

type PhotoLike = {
    url: string;
    isMain?: boolean;
};

/**
 * Главное фото для миниатюры в карточке записи (тренировки/заметки):
 * сначала своя фотография (отмеченная как главная, либо первая
 * загруженная) — как и раньше. Если своих фото нет вовсе, но в
 * записи отмечена площадка — берём главное фото самой площадки: не
 * пустая карточка, если тренировка прошла на известном месте. Если и
 * у площадки фото нет — миниатюры не будет, как и до этого изменения.
 */
export function getCardPhotoUrl(
    photos: PhotoLike[] | undefined,
    playground: Playground | undefined
): string | undefined {
    const ownMainPhoto =
        photos?.find((photo) => photo.isMain) ?? photos?.[0];

    if (ownMainPhoto) {
        return ownMainPhoto.url;
    }

    const playgroundMainPhoto =
        playground?.photos.find((photo) => photo.isMain) ??
        playground?.photos[0];

    return playgroundMainPhoto?.url;
}
