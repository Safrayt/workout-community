import "../../styles/components/playground-main-photo.css";

import type { PlaygroundPhoto } from "../../types/playground";

type PlaygroundMainPhotoProps = {
    photos: PlaygroundPhoto[];

    playgroundName: string;
};

export default function PlaygroundMainPhoto({
    photos,
    playgroundName,
}: PlaygroundMainPhotoProps) {
    const mainPhoto =
        photos.find((photo) => photo.isMain) ??
        photos[0];

    if (!mainPhoto) {
        return null;
    }

    return (
        <div className="playground-main-photo">
            <img
                src={mainPhoto.url}
                alt={mainPhoto.description ?? playgroundName}
                className="playground-main-photo__image"
            />
        </div>
    );
}