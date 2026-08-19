import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DiaryRecord } from "../../types/diaryRecord";
import type { User } from "../../types/user";
import type { Playground } from "../../types/playground";
import type { Comment } from "../../types/comment";
import type { HomeFeedMode } from "../../types/homeFeedRecord";

import HomeFeedTabs from "../HomeFeedTabs/HomeFeedTabs";
import HomeFeedCard from "../HomeFeedCard/HomeFeedCard";
import Button from "../ui/Button/Button";

import { getFeedRecords, buildHomeFeedRecords } from "../../utils/homeFeed";
import { HOME_FEED_PAGE_SIZE } from "../../constants/home";
import { useSimulatedLoad } from "../../hooks/useSimulatedLoad";

import "../../styles/components/home-feed.css";

type HomeFeedProps = {
    records: DiaryRecord[];
    users: User[];
    playgrounds: Playground[];
    comments: Comment[];
    followingIds: string[];
};

/**
 * Социальная лента Главной — основной контент страницы (UX-HOME §12,
 * §37 п.20). Владеет состоянием вкладки и глубиной pagination;
 * бизнес-логика (сортировка, дневной лимит, фильтр по вкладке)
 * целиком вынесена в utils/homeFeed.ts (§32).
 */
export default function HomeFeed({
    records,
    users,
    playgrounds,
    comments,
    followingIds,
}: HomeFeedProps) {
    const [mode, setMode] = useState<HomeFeedMode>("all");
    const [visibleCount, setVisibleCount] = useState(HOME_FEED_PAGE_SIZE);

    const { status, retry, reload } = useSimulatedLoad();

    function handleModeChange(nextMode: HomeFeedMode) {
        setMode(nextMode);
        setVisibleCount(HOME_FEED_PAGE_SIZE);
        reload();
    }

    if (status === "error") {
        return (
            <div className="home-feed">
                <HomeFeedTabs
                    mode={mode}
                    onChange={handleModeChange}
                />

                <div className="home-feed__error">
                    <p>Не удалось загрузить записи</p>

                    <Button onClick={retry}>Повторить</Button>
                </div>
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div className="home-feed">
                <HomeFeedTabs
                    mode={mode}
                    onChange={handleModeChange}
                />

                <div className="home-feed__skeleton" aria-hidden="true">
                    {
                        Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="home-feed-card-skeleton"
                            />
                        ))
                    }
                </div>
            </div>
        );
    }

    const feedRecordsRaw = getFeedRecords(
        records,
        users,
        mode,
        followingIds
    );

    const visibleRecords = feedRecordsRaw.slice(0, visibleCount);

    const feedRecords = buildHomeFeedRecords(
        visibleRecords,
        users,
        playgrounds,
        comments
    );

    const hasMore = feedRecordsRaw.length > visibleRecords.length;

    return (
        <div className="home-feed">
            <HomeFeedTabs
                mode={mode}
                onChange={handleModeChange}
            />

            {
                feedRecords.length === 0 ? (
                    <HomeFeedEmptyState
                        mode={mode}
                        hasFollowing={followingIds.length > 0}
                        onSwitchToAll={() => handleModeChange("all")}
                    />
                ) : (
                    <>
                        <div className="home-feed__list">
                            {
                                feedRecords.map((feedRecord) => (
                                    <HomeFeedCard
                                        key={`${feedRecord.record.type}-${feedRecord.record.data.id}`}
                                        feedRecord={feedRecord}
                                    />
                                ))
                            }
                        </div>

                        {
                            hasMore && (
                                <div className="home-feed__load-more">
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            setVisibleCount(
                                                (current) =>
                                                    current + HOME_FEED_PAGE_SIZE
                                            )
                                        }
                                    >
                                        Загрузить ещё
                                    </Button>
                                </div>
                            )
                        }
                    </>
                )
            }
        </div>
    );
}

type HomeFeedEmptyStateProps = {
    mode: HomeFeedMode;
    hasFollowing: boolean;
    onSwitchToAll: () => void;
};

/** Три варианта пустого состояния ленты (UX-HOME §26). */
function HomeFeedEmptyState({
    mode,
    hasFollowing,
    onSwitchToAll,
}: HomeFeedEmptyStateProps) {
    const navigate = useNavigate();

    if (mode === "all") {
        return (
            <div className="home-feed__empty">
                <p className="home-feed__empty-title">
                    В ленте пока пусто
                </p>

                <p className="home-feed__empty-text">
                    Здесь будут появляться тренировки
                    <br />
                    и заметки участников сообщества.
                </p>

                <Button onClick={() => navigate("/diary/create")}>
                    Записать тренировку
                </Button>
            </div>
        );
    }

    if (!hasFollowing) {
        return (
            <div className="home-feed__empty">
                <p className="home-feed__empty-title">
                    Здесь пока ничего нет
                </p>

                <p className="home-feed__empty-text">
                    Подпишись на спортсменов, за которыми
                    <br />
                    хочешь следить, — их новые записи
                    <br />
                    появятся здесь.
                </p>

                <Button onClick={() => navigate("/profile/subscriptions")}>
                    Найти спортсменов
                </Button>
            </div>
        );
    }

    return (
        <div className="home-feed__empty">
            <p className="home-feed__empty-title">
                Новых записей нет
            </p>

            <p className="home-feed__empty-text">
                Люди, на которых ты подписан,
                <br />
                пока ничего нового не добавили.
            </p>

            <Button onClick={onSwitchToAll}>
                Смотреть все записи
            </Button>
        </div>
    );
}
