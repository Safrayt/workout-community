import "../../styles/components/selected-playground-preview.css";

import type { Playground } from "../../types/playground";

type SelectedPlaygroundPreviewProps = {
    playground: Playground;
};

export default function SelectedPlaygroundPreview({
    playground,
}: SelectedPlaygroundPreviewProps) {
    const mainPhoto =
        playground.photos.find((photo) => photo.isMain) ??
        playground.photos[0];

    return (
        <div className="selected-playground-preview">
            {
                mainPhoto ? (
                    <img
                        src={mainPhoto.url}
                        alt={playground.name}
                        className="selected-playground-preview__photo"
                    />
                ) : (
                    <div className="selected-playground-preview__photo selected-playground-preview__photo--placeholder">
                        Нет фото
                    </div>
                )
            }

            <div className="selected-playground-preview__info">
                <p className="selected-playground-preview__name">
                    {playground.name}
                </p>

                <p className="selected-playground-preview__locality">
                    {playground.locality}
                </p>

                <p className="selected-playground-preview__address">
                    {playground.address}
                </p>
            </div>
        </div>
    );
}