import { Link } from "react-router-dom";

import "../../styles/components/playground-reviews.css";

import InfoSection from "../ui/InfoSection/InfoSection";
import Button from "../ui/Button/Button";

import { useReviews } from "../../context/ReviewContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import UserLink from "../UserLink/UserLink";

import { getRecentPlaygroundReviews } from "../../utils/reviews";
import { formatDate } from "../../utils/formatDate";

type Props = {
    playgroundId: string;
};

/**
 * Компактная витрина отзывов прямо на странице площадки: не более
 * 3 последних, каждый обрезан до 3 строк (многоточием), с переходом
 * на отдельную страницу со всеми отзывами целиком и на форму
 * добавления нового отзыва.
 */
export default function PlaygroundReviews({
    playgroundId,
}: Props) {
    const { reviews } = useReviews();

    const { getUserById } = useUserDirectory();

    const recentReviews = getRecentPlaygroundReviews(
        reviews,
        playgroundId
    );

    return (
        <InfoSection title="Отзывы">
            {
                recentReviews.length === 0

                    ? (

                        <p>
                            Отзывов пока нет.
                        </p>

                    )

                    : (

                        <div className="playground-reviews">

                            {
                                recentReviews.map((review) => (

                                    <div
                                        key={review.id}
                                        className="playground-reviews__item"
                                    >
                                        <div className="playground-reviews__meta">
                                            <span className="playground-reviews__author">
                                                <UserLink
                                                    username={
                                                        getUserById(review.userId)?.nickname ?? "неизвестный"
                                                    }
                                                />
                                            </span>

                                            <span className="playground-reviews__date">
                                                {formatDate(review.createdAt)}
                                            </span>
                                        </div>

                                        <p className="playground-reviews__text">
                                            {review.text}
                                        </p>
                                    </div>

                                ))
                            }

                        </div>

                    )
            }

            <div className="playground-reviews__actions">
                <Link to={`/playgrounds/${playgroundId}/reviews/create`}>
                    <Button variant="primary">
                        Написать отзыв
                    </Button>
                </Link>

                {
                    recentReviews.length > 0 && (

                        <Link to={`/playgrounds/${playgroundId}/reviews`}>
                            <Button variant="outline">
                                Все отзывы
                            </Button>
                        </Link>

                    )
                }
            </div>
        </InfoSection>
    );
}
