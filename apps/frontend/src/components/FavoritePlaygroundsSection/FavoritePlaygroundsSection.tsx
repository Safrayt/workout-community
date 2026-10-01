import { useState } from "react";
import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";
import ActionGroup from "../ui/ActionGroup/ActionGroup";

import "../../styles/components/favorite-playgrounds-section.css";

import { useCurrentUser } from "../../context/CurrentUserContext";
import { useFavorites } from "../../context/FavoriteContext";
import { usePlaygrounds } from "../../context/PlaygroundContext";

import { getRecentFavoritePlaygrounds } from "../../utils/favorites";

import { FAVORITE_PLAYGROUNDS_PREVIEW_LIMIT } from "../../constants/user";

/**
 * Раздел "Избранные площадки" на странице собственного профиля:
 * список площадок, добавленных в избранное, с возможностью убрать
 * любую из них. Избранное — личные данные: сервер отдаёт его только
 * самому пользователю, поэтому раздел показывается только в своём
 * профиле (решает страница профиля).
 *
 * Сначала показываются самые недавно добавленные площадки — те же,
 * что предлагаются для быстрого выбора в форме записи дневника;
 * остальные раскрываются кнопкой "Показать все".
 */
export default function FavoritePlaygroundsSection() {
    const { currentUser } = useCurrentUser();
    const { favorites, removeFavorite } = useFavorites();
    const { playgrounds } = usePlaygrounds();

    const [isExpanded, setIsExpanded] = useState(false);
    const [removingIds, setRemovingIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const favoritePlaygrounds = getRecentFavoritePlaygrounds(
        playgrounds,
        favorites,
        currentUser.id,
        Infinity
    );

    const hasHiddenItems =
        favoritePlaygrounds.length > FAVORITE_PLAYGROUNDS_PREVIEW_LIMIT;

    const visiblePlaygrounds =
        isExpanded || !hasHiddenItems
            ? favoritePlaygrounds
            : favoritePlaygrounds.slice(
                0,
                FAVORITE_PLAYGROUNDS_PREVIEW_LIMIT
            );

    async function handleRemove(playgroundId: string) {
        setError(null);
        setRemovingIds((current) => [...current, playgroundId]);

        try {
            await removeFavorite(playgroundId);
        } catch (err) {
            console.error("Не удалось убрать площадку из избранного:", err);

            setError(
                "Не удалось убрать площадку из избранного. Попробуйте ещё раз."
            );
        } finally {
            setRemovingIds((current) =>
                current.filter((id) => id !== playgroundId)
            );
        }
    }

    if (favoritePlaygrounds.length === 0) {
        return (
            <div className="profile-empty">
                <p>
                    В избранном пока нет площадок. Добавить площадку в
                    избранное можно на её странице.
                </p>

                <Link to="/playgrounds">
                    <Button variant="secondary">
                        Найти площадки
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            {
                error && (
                    <p className="favorite-playgrounds__error" role="alert">
                        {error}
                    </p>
                )
            }

            <ul className="favorite-playgrounds">
                {
                    visiblePlaygrounds.map((playground) => {
                        const mainPhoto =
                            playground.photos.find((photo) => photo.isMain) ??
                            playground.photos[0];

                        const isRemoving = removingIds.includes(playground.id);

                        return (
                            <li
                                key={playground.id}
                                className="favorite-playgrounds__item"
                            >
                                <Link
                                    to={`/playgrounds/${playground.id}`}
                                    className="favorite-playgrounds__link"
                                >
                                    {
                                        mainPhoto ? (
                                            <img
                                                src={mainPhoto.url}
                                                alt=""
                                                className="favorite-playgrounds__photo"
                                            />
                                        ) : (
                                            <span className="favorite-playgrounds__photo favorite-playgrounds__photo--placeholder">
                                                Нет фото
                                            </span>
                                        )
                                    }

                                    <span className="favorite-playgrounds__info">
                                        <span className="favorite-playgrounds__name">
                                            {playground.name}
                                        </span>

                                        {
                                            playground.locality && (
                                                <span className="favorite-playgrounds__locality">
                                                    {playground.locality}
                                                </span>
                                            )
                                        }
                                    </span>
                                </Link>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="favorite-playgrounds__remove"
                                    disabled={isRemoving}
                                    aria-label={`Убрать площадку «${playground.name}» из избранного`}
                                    onClick={() => handleRemove(playground.id)}
                                >
                                    {isRemoving ? "Убираем…" : "Убрать"}
                                </Button>
                            </li>
                        );
                    })
                }
            </ul>

            {
                hasHiddenItems && (
                    <ActionGroup>
                        <Button
                            type="button"
                            variant="secondary"
                            aria-expanded={isExpanded}
                            onClick={() => setIsExpanded((current) => !current)}
                        >
                            {
                                isExpanded
                                    ? "Свернуть"
                                    : `Показать все (${favoritePlaygrounds.length})`
                            }
                        </Button>
                    </ActionGroup>
                )
            }
        </>
    );
}
