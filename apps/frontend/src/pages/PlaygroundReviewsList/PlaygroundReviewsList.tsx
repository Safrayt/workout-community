import { Link, useParams } from "react-router-dom";

import "../../styles/components/playground-reviews-list.css";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";

import PlaygroundReviewListItem from "../../components/PlaygroundReviewListItem/PlaygroundReviewListItem";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useReviews,
} from "../../context/ReviewContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import { getPlaygroundReviews } from "../../utils/reviews";

export default function PlaygroundReviewsList() {

    const { id } = useParams();

    const { playgrounds } = usePlaygrounds();

    const { reviews } = useReviews();

    const playground =
        id
            ? getPlaygroundById(playgrounds, id)
            : undefined;

    if (!playground) {

        return (
            <Section title="Отзывы">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );

    }

    const playgroundReviews = getPlaygroundReviews(
        reviews,
        playground.id
    );

    return (

        <Section title={`Отзывы: ${playground.name}`}>

            <Link
                to={`/playgrounds/${playground.id}`}
                className="playground-reviews-list__back"
            >
                ← Назад к площадке
            </Link>

            <div className="playground-reviews-list__actions">
                <Link to={`/playgrounds/${playground.id}/reviews/create`}>
                    <Button variant="primary">
                        Написать отзыв
                    </Button>
                </Link>
            </div>

            {
                playgroundReviews.length === 0

                    ? (

                        <p>
                            Отзывов пока нет.
                        </p>

                    )

                    : (

                        <ul className="playground-reviews-list">

                            {
                                playgroundReviews.map((review) => (

                                    <PlaygroundReviewListItem
                                        key={review.id}
                                        review={review}
                                    />

                                ))
                            }

                        </ul>

                    )
            }

        </Section>

    );

}
