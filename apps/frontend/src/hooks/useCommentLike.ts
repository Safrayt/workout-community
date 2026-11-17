import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
    fetchCommentLikes,
    likeComment,
    unlikeComment,
    type CommentKind,
} from "../api/commentLikes";
import { useAuth } from "../context/CurrentUserContext";

/**
 * Лайки комментариев. Комментарии приложение получает сразу все (у
 * каждого вида — свой список), так же и лайки: один запрос на вид
 * комментариев, а не по запросу на каждый комментарий. Данные лежат в
 * общем хранилище на уровне модуля, поэтому все комментарии на странице
 * (и при переходах между страницами) пользуются одним запросом, а
 * лайк, поставленный в одном месте, сразу виден везде.
 */

type LikeEntry = { count: number; likedByMe: boolean };

type Snapshot = {
    byId: Readonly<Record<string, LikeEntry>>;
};

type Store = {
    snapshot: Snapshot;
    listeners: Set<() => void>;
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => Snapshot;

    /** Для какого пользователя (null — гость) загружены данные; undefined
     *  — ещё не загружались. */
    userId: string | null | undefined;
    loadedAt: number;
    isLoading: boolean;

    /** Растёт при каждом изменении, чтобы запоздавший ответ на старый
     *  запрос не затёр свежие данные. */
    version: number;
};

/** Как долго данные считаются свежими: при открытии новой страницы с
 *  комментариями старше этого срока они подгружаются заново. */
const FRESH_FOR_MS = 30 * 1000;

const EMPTY_ENTRY: LikeEntry = { count: 0, likedByMe: false };

const stores = new Map<CommentKind, Store>();

function getStore(kind: CommentKind): Store {
    let store = stores.get(kind);

    if (!store) {
        const created: Store = {
            snapshot: { byId: {} },
            listeners: new Set(),
            subscribe: (listener) => {
                created.listeners.add(listener);

                return () => created.listeners.delete(listener);
            },
            getSnapshot: () => created.snapshot,
            userId: undefined,
            loadedAt: 0,
            isLoading: false,
            version: 0,
        };

        stores.set(kind, created);
        store = created;
    }

    return store;
}

function publish(store: Store, byId: Record<string, LikeEntry>) {
    store.version += 1;
    store.snapshot = { byId };
    store.listeners.forEach((listener) => listener());
}

function setEntry(store: Store, commentId: string, entry: LikeEntry) {
    const byId = { ...store.snapshot.byId };

    if (entry.count > 0 || entry.likedByMe) {
        byId[commentId] = entry;
    } else {
        delete byId[commentId];
    }

    publish(store, byId);
}

function ensureLoaded(kind: CommentKind, userId: string | null) {
    const store = getStore(kind);
    const sameUser = store.userId === userId;
    const isFresh = Date.now() - store.loadedAt < FRESH_FOR_MS;

    if (store.isLoading || (sameUser && isFresh)) {
        return;
    }

    if (!sameUser) {
        // Вошёл или вышел другой человек — чужие «мои лайки» не показываем.
        store.userId = userId;
        publish(store, {});
    }

    store.isLoading = true;
    const versionAtStart = store.version;

    fetchCommentLikes(kind)
        .then((summaries) => {
            // Пока шёл запрос, лайк успели поставить или снять — свежее
            // состояние точнее ответа, который был сформирован раньше.
            if (store.version !== versionAtStart || store.userId !== userId) {
                return;
            }

            const byId: Record<string, LikeEntry> = {};

            summaries.forEach((summary) => {
                byId[summary.commentId] = {
                    count: summary.count,
                    likedByMe: summary.likedByMe,
                };
            });

            store.loadedAt = Date.now();
            publish(store, byId);
        })
        .catch((error: unknown) => {
            // Без счётчиков страница работает, просто числа не видны;
            // следующая страница с комментариями попробует ещё раз.
            console.error("Не удалось загрузить лайки комментариев:", error);
        })
        .finally(() => {
            store.isLoading = false;
        });
}

export type CommentLikeState = {
    count: number;
    liked: boolean;

    /** Поставить лайк или снять его (в зависимости от текущего состояния).
     *  Число меняется сразу, а при ошибке возвращается и бросается ошибка. */
    toggle: () => Promise<void>;
};

export function useCommentLike(
    kind: CommentKind,
    commentId: string
): CommentLikeState {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const store = getStore(kind);

    const snapshot = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        // Приложение рисуется только в браузере, но функция нужна React
        // и при отрисовке на сервере (например, в проверках).
        store.getSnapshot
    );

    useEffect(() => {
        ensureLoaded(kind, userId);
    }, [kind, userId]);

    const entry = snapshot.byId[commentId] ?? EMPTY_ENTRY;

    const toggle = useCallback(async () => {
        const current = getStore(kind).snapshot.byId[commentId] ?? EMPTY_ENTRY;
        const target = getStore(kind);

        setEntry(target, commentId, {
            count: current.likedByMe
                ? Math.max(0, current.count - 1)
                : current.count + 1,
            likedByMe: !current.likedByMe,
        });

        try {
            const summary = current.likedByMe
                ? await unlikeComment(kind, commentId)
                : await likeComment(kind, commentId);

            setEntry(target, commentId, {
                count: summary.count,
                likedByMe: summary.likedByMe,
            });
        } catch (error) {
            setEntry(target, commentId, current);

            throw error;
        }
    }, [kind, commentId]);

    return { count: entry.count, liked: entry.likedByMe, toggle };
}
