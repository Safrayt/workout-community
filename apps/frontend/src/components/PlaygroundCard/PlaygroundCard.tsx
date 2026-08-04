import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import "../../styles/components/PlaygroundCard.css";

import type {
    PlaygroundPhoto,
} from "../../types/playground";

type PlaygroundCardProps = {
    id: string;

    name: string;

    locality: string;

    photos: PlaygroundPhoto[];
};

export default function PlaygroundCard({
    id,
    name,
    locality,
    photos,
}: PlaygroundCardProps) {
    const mainPhoto =
        photos.find((photo) => photo.isMain) ??
        photos[0];

    return (
        <Card className="playground-card">
            {
                mainPhoto ? (
                    <img
                        src={mainPhoto.url}
                        alt={name}
                        className="playground-card__photo"
                    />
                ) : (
                    <div className="playground-card__photo playground-card__photo--placeholder">
                        Нет фото
                    </div>
                )
            }

            <div className="playground-card__info">
                <h3 className="playground-card__name">
                    {name}
                </h3>

                <p className="playground-card__locality">
                    {locality}
                </p>

                <Link
                    to={`/playgrounds/${id}`}
                    className="playground-card__link"
                >
                    <Button variant="outline">
                        Подробнее
                    </Button>
                </Link>
            </div>
        </Card>
    );
}