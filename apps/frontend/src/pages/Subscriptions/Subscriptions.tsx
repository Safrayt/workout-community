import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Pagination from "../../components/ui/Pagination/Pagination";

import SubscriptionsList from "../../components/SubscriptionsList/SubscriptionsList";

import "../../styles/components/events-list.css";
import "../../styles/components/profile.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import {
    useSubscriptions,
} from "../../context/SubscriptionContext";

import { getFollowingIds } from "../../utils/subscriptions";

import { paginate, getTotalPages } from "../../utils/pagination";

// Элементы компактные ("пилюли" с аватаром), поэтому на странице их
// помещается заметно больше, чем карточек событий/записей.
const PAGE_SIZE = 24;

/**
 * Обслуживает /profile/subscriptions (свои подписки) и
 * /u/:username/subscriptions (чужие, если не скрыты в настройках
 * приватности).
 */
export default function Subscriptions() {
    const { username } = useParams();

    const {
        currentUser,
    } = useCurrentUser();

    const { getUserByUsername } = useUserDirectory();

    const {
        subscriptions,
    } = useSubscriptions();

    const [page, setPage] = useState(1);

    const user = username
        ? getUserByUsername(username)
        : currentUser;

    const isOwnProfile = user?.id === currentUser.id;

    if (!user) {
        return (
            <Section title="Подписки">
                <div className="profile-empty">
                    <p>
                        Пользователь @{username} не найден.
                    </p>
                </div>
            </Section>
        );
    }

    if (!isOwnProfile && !user.privacySettings.subscriptionsVisible) {
        return (
            <Section title={`Подписки — ${user.nickname}`}>
                <div className="profile-empty">
                    <p>
                        Этот пользователь закрыл список подписок от
                        посторонних.
                    </p>

                    <Link to={`/u/${user.nickname}`}>
                        <Button variant="secondary">
                            Назад к профилю
                        </Button>
                    </Link>
                </div>
            </Section>
        );
    }

    const followingIds = getFollowingIds(
        subscriptions,
        user.id
    );

    const totalPages = getTotalPages(
        followingIds.length,
        PAGE_SIZE
    );

    const pageIds = paginate(
        followingIds,
        page,
        PAGE_SIZE
    );

    const backHref = isOwnProfile
        ? "/profile"
        : `/u/${user.nickname}`;

    return (
        <Section title={isOwnProfile ? "Мои подписки" : `Подписки — ${user.nickname}`}>
            <Link to={backHref} className="events-back-link">
                ← Назад к профилю
            </Link>

            {
                followingIds.length === 0 ? (
                    <div className="profile-empty">
                        <p>
                            {
                                isOwnProfile
                                    ? "Ты пока ни на кого не подписан."
                                    : "Пользователь пока ни на кого не подписан."
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <SubscriptionsList userIds={pageIds} />

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </>
                )
            }
        </Section>
    );
}
