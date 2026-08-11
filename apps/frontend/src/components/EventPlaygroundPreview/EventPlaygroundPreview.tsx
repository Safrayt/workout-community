import "../../styles/components/event-playground-preview.css";

import { Link } from "react-router-dom";

import type {
    Playground,
} from "../../types/playground";

import {
    calculatePlaygroundRating,
} from "../../utils/playgroundRating";

import {
    getRatingTier,
} from "../../constants/playgroundRating";

import {
    playgroundSizes,
} from "../../constants/playgroundProperties";

type Props = {

    playground?: Playground;

};

/**
 * Компактный preview площадки на странице события (UX §20).
 *
 * Сознательно НЕ показывает: галерею, полный список оборудования,
 * удобства, отзывы, историю площадки — за подробностями пользователь
 * переходит на Playground Details (§21). Маршрут тоже не строится
 * здесь — это тоже задача страницы площадки (§22).
 */
export default function EventPlaygroundPreview({
    playground,
}: Props) {

    if (!playground) {
        return (
            <section className="event-playground-preview event-playground-preview--empty">
                <h2 className="event-playground-preview__title">
                    Место проведения
                </h2>

                <p className="event-playground-preview__message">
                    Место проведения недоступно.
                </p>
            </section>
        );
    }

    const mainPhoto =
        playground.photos.find((photo) => photo.isMain) ??
        playground.photos[0];

    const rating =
        calculatePlaygroundRating(playground);

    const ratingTier =
        getRatingTier(rating);

    return (

        <section className="event-playground-preview">

            <h2 className="event-playground-preview__title">
                Место проведения
            </h2>

            <Link
                to={`/playgrounds/${playground.id}`}
                className="event-playground-preview__card"
            >
                {
                    mainPhoto ? (
                        <img
                            src={mainPhoto.url}
                            alt={playground.name}
                            className="event-playground-preview__photo"
                        />
                    ) : (
                        <div className="event-playground-preview__photo event-playground-preview__photo--placeholder">
                            Нет фото
                        </div>
                    )
                }

                <div className="event-playground-preview__info">

                    <p className="event-playground-preview__name">
                        {playground.name}
                    </p>

                    <p
                        className="event-playground-preview__fact event-playground-preview__fact--rating"
                        style={{
                            color: ratingTier.color,
                        }}
                    >
                        {`Рейтинг: ${rating}`}
                    </p>

                    <p className="event-playground-preview__fact">
                        {`${playground.equipment.length} элементов`}
                    </p>

                    <p className="event-playground-preview__fact">
                        {playgroundSizes[playground.size]}
                    </p>

                </div>

            </Link>

        </section>

    );
}
