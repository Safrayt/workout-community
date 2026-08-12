import "../../styles/components/workout-entry-playground-preview.css";

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

type Props = {

    playgroundId?: string;

    playground?: Playground;

};

/**
 * Компактный preview площадки на странице записи (UX-DIARY-ENTRY
 * §16–18, §27).
 *
 * Сознательно НЕ показывает оборудование, удобства, карту или
 * полное описание — запись дневника лишь отвечает "где проходила
 * тренировка", за подробностями пользователь переходит на
 * Playground Details. Если у записи вовсе нет площадки, блок
 * не рендерится (в отличие от версии на странице события —
 * здесь пустое состояние не нужно, §18). Если площадка была
 * указана, но с тех пор удалена, показывается отдельное сообщение
 * об недоступности, а сама запись остаётся видимой (§27).
 */
export default function WorkoutEntryPlaygroundPreview({
    playgroundId,
    playground,
}: Props) {

    if (!playgroundId) {
        return null;
    }

    if (!playground) {
        return (
            <section className="workout-entry-playground-preview workout-entry-playground-preview--empty">
                <h2 className="workout-entry-playground-preview__title">
                    Место тренировки
                </h2>

                <p className="workout-entry-playground-preview__message">
                    Площадка больше недоступна.
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

        <section className="workout-entry-playground-preview">

            <h2 className="workout-entry-playground-preview__title">
                Место тренировки
            </h2>

            <Link
                to={`/playgrounds/${playground.id}`}
                className="workout-entry-playground-preview__card"
            >
                {
                    mainPhoto ? (
                        <img
                            src={mainPhoto.url}
                            alt={playground.name}
                            className="workout-entry-playground-preview__photo"
                        />
                    ) : (
                        <div className="workout-entry-playground-preview__photo workout-entry-playground-preview__photo--placeholder">
                            Нет фото
                        </div>
                    )
                }

                <div className="workout-entry-playground-preview__info">

                    <p className="workout-entry-playground-preview__name">
                        {playground.name}
                    </p>

                    <p className="workout-entry-playground-preview__fact">
                        {playground.locality}
                    </p>

                    <p
                        className="workout-entry-playground-preview__fact workout-entry-playground-preview__fact--rating"
                        style={{
                            color: ratingTier.color,
                        }}
                    >
                        {`Рейтинг ${rating}`}
                    </p>

                </div>

            </Link>

        </section>

    );
}
