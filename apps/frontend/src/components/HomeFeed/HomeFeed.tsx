import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DiaryRecord } from "../../types/diaryRecord";
import type { User } from "../../types/user";
import type { Playground } from "../../types/playground";
import type { Comment } from "../../types/comment";
import type { Event } from "../../types/event";
import type { HomeFeedMode } from "../../types/homeFeedRecord";

import HomeFeedTabs from "../HomeFeedTabs/HomeFeedTabs";
import HomeFeedCard from "../HomeFeedCard/HomeFeedCard";
import SystemFeedCard from "../SystemFeedCard/SystemFeedCard";
import Button from "../ui/Button/Button";

import {
    getAdminFeedRecords,
    getFeedRecords,
    getSystemFeedRecords,
    mergeFeedRawItems,
    buildHomeFeedItems,
} from "../../utils/homeFeed";
import { buildDiaryRecords } from "../../utils/diaryRecords";
import { listDiaryNotes, listWorkoutEntries } from "../../api/diary";
import { HOME_FEED_PAGE_SIZE } from "../../constants/home";
import { useSimulatedLoad } from "../../hooks/useSimulatedLoad";

import "../../styles/components/home-feed.css";

type HomeFeedProps = {
    records: DiaryRecord[];
    users: User[];
    playgrounds: Playground[];
    comments: Comment[];
    events: Event[];
    followingIds: string[];

    /** Показывать ли вкладку "Администрирование". */
    isAdmin: boolean;
};

/**
 * Социальная лента Главной — основной контент страницы (UX-HOME §12,
 * §37 п.20). Владеет состоянием вкладки и глубиной pagination;
 * бизнес-логика (сортировка, дневной лимит, фильтр по вкладке)
 * целиком вынесена в utils/homeFeed.ts (§32).
 *
 * Вкладка "Администрирование" — особый случай: в отличие от "Все
 * записи"/"Подписки", которые работают над уже загруженным (и уже
 * отфильтрованным по приватности бэкендом) списком records из
 * пропсов, она дозагружает свой ОТДЕЛЬНЫЙ набор данных через
 * include_hidden=true (см. api/diary.ts) — специально не смешивая
 * его с обычным WorkoutDiaryContext/DiaryNotesContext, чтобы полные
 * данные (включая скрытые приватностью записи) не осели в общем
 * состоянии приложения и не "утекли" в какой-нибудь другой компонент,
 * который читает те же контексты.
 */
export default function HomeFeed({
    records,
    users,
    playgrounds,
    comments,
    events,
    followingIds,
    isAdmin,
}: HomeFeedProps) {
    const [mode, setMode] = useState<HomeFeedMode>("all");
    const [visibleCount, setVisibleCount] = useState(HOME_FEED_PAGE_SIZE);

    const { status, retry, reload } = useSimulatedLoad();

    const [adminRecords, setAdminRecords] = useState<DiaryRecord[] | null>(
        null
    );
    const [isLoadingAdminRecords, setIsLoadingAdminRecords] = useState(false);
    const [adminLoadError, setAdminLoadError] = useState(false);

    useEffect(() => {
        if (mode !== "admin" || adminRecords !== null || !isAdmin) {
            return;
        }

        let cancelled = false;
        setIsLoadingAdminRecords(true);
        setAdminLoadError(false);

        Promise.all([
            listWorkoutEntries({ includeHidden: true }),
            listDiaryNotes({ includeHidden: true }),
        ])
            .then(([entries, notes]) => {
                if (!cancelled) {
                    setAdminRecords(buildDiaryRecords(entries, notes));
                }
            })
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить все записи для администратора:",
                    error
                );
                if (!cancelled) {
                    setAdminLoadError(true);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingAdminRecords(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mode, adminRecords, isAdmin]);

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
                    showAdminTab={isAdmin}
                />

                <div className="home-feed__error">
                    <p>Не удалось загрузить записи</p>

                    <Button onClick={retry}>Повторить</Button>
                </div>
            </div>
        );
    }

    if (status === "loading" || (mode === "admin" && isLoadingAdminRecords)) {
        return (
            <div className="home-feed">
                <HomeFeedTabs
                    mode={mode}
                    onChange={handleModeChange}
                    showAdminTab={isAdmin}
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

    if (mode === "admin" && adminLoadError) {
        return (
            <div className="home-feed">
                <HomeFeedTabs
                    mode={mode}
                    onChange={handleModeChange}
                    showAdminTab={isAdmin}
                />

                <div className="home-feed__error">
                    <p>Не удалось загрузить записи</p>

                    <Button
                        onClick={() => {
                            setAdminRecords(null);
                        }}
                    >
                        Повторить
                    </Button>
                </div>
            </div>
        );
    }

    const feedRecordsRaw =
        mode === "admin"
            ? getAdminFeedRecords(adminRecords ?? [])
            : getFeedRecords(records, users, mode, followingIds);

    const systemRecordsRaw = getSystemFeedRecords(
        events,
        playgrounds,
        mode,
        followingIds
    );

    const combinedRawItems = mergeFeedRawItems(
        feedRecordsRaw,
        systemRecordsRaw
    );

    const visibleRawItems = combinedRawItems.slice(0, visibleCount);

    const feedItems = buildHomeFeedItems(
        visibleRawItems,
        users,
        playgrounds,
        comments
    );

    const hasMore = combinedRawItems.length > visibleRawItems.length;

    return (
        <div className="home-feed">
            <HomeFeedTabs
                mode={mode}
                onChange={handleModeChange}
                showAdminTab={isAdmin}
            />

            {
                feedItems.length === 0 ? (
                    <HomeFeedEmptyState
                        mode={mode}
                        hasFollowing={followingIds.length > 0}
                        onSwitchToAll={() => handleModeChange("all")}
                    />
                ) : (
                    <>
                        <div className="home-feed__list">
                            {
                                feedItems.map((item) =>
                                    item.kind === "diary" ? (
                                        <HomeFeedCard
                                            key={`diary-${item.feedRecord.record.type}-${item.feedRecord.record.data.id}`}
                                            feedRecord={item.feedRecord}
                                        />
                                    ) : (
                                        <SystemFeedCard
                                            key={`system-${item.feedRecord.record.type}-${item.feedRecord.record.data.id}`}
                                            feedRecord={item.feedRecord}
                                            playgrounds={playgrounds}
                                        />
                                    )
                                )
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

    if (mode === "admin") {
        return (
            <div className="home-feed__empty">
                <p className="home-feed__empty-title">
                    Записей пока нет вообще ни у кого
                </p>

                <p className="home-feed__empty-text">
                    Здесь появятся все тренировки и заметки
                    <br />
                    сообщества, включая скрытые приватностью.
                </p>
            </div>
        );
    }

    if (mode === "all") {
        return (
            <div className="home-feed__empty">
                <p className="home-feed__empty-title">
                    В ленте пока нет записей
                </p>

                <p className="home-feed__empty-text">
                    Здесь появятся тренировки, заметки,
                    <br />
                    события и новые площадки.
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
