import { useEffect, useEffectEvent, useState } from "react";

import type { NewArticle } from "../types/article";

import {
    clearArticleDraft,
    loadArticleDraft,
    saveArticleDraft,
} from "../utils/articleDraftStorage";
import { isSameArticleContent } from "../utils/articleForm";

/**
 * Пауза после последнего изменения, по истечении которой копия пишется
 * в хранилище. Запись на каждую букву была бы лишней (текст до 100 000
 * символов), а если ждать дольше, при закрытии вкладки терялось бы
 * больше набранного. Остаток, не успевший записаться, сохраняется
 * сразу при уходе со страницы — см. второй эффект ниже.
 */
export const AUTOSAVE_DELAY_MS = 1000;

/** Копия, найденная при открытии редактора, — ждёт решения: восстановить или удалить. */
export type PendingArticleDraft = {
    value: NewArticle;

    /** Когда копия была сохранена (ISO). */
    savedAt: string;

    /**
     * Статью на сайте изменили после того, как копия была начата: если
     * восстановить копию и сохранить, эти изменения будут перезаписаны.
     * У новой статьи (которой на сайте ещё нет) не бывает.
     */
    isConflict: boolean;
};

export type AutosaveStatus =
    | { kind: "idle" }
    | { kind: "saved"; at: Date }
    | { kind: "failed" };

type UseArticleDraftAutosaveParams = {
    /** null — новая статья. */
    articleId: string | null;

    /** updatedAt статьи на сайте на момент открытия редактора (у новой — null). */
    baseUpdatedAt: string | null;

    /** Значение, с которого началась правка, — то, что сейчас на сайте. */
    initialValue: NewArticle;

    /** Текущее содержимое формы. */
    draft: NewArticle;

    /**
     * true — автосохранение приостановлено: идёт отправка статьи на
     * сайт. Копию в это время трогать нельзя — после успеха её удаляет
     * страница, и поздняя запись воскресила бы её. Если отправка не
     * удалась, пауза снимается, и несохранённый текст снова
     * записывается.
     */
    paused: boolean;
};

export type ArticleDraftAutosave = {
    /** Форма отличается от сохранённого на сайте. */
    isDirty: boolean;

    /** Найденная при открытии копия, ожидающая решения (иначе null). */
    pendingDraft: PendingArticleDraft | null;

    /** Принять найденную копию: вернёт её содержимое, которое нужно подставить в форму. */
    restorePending: () => NewArticle | null;

    /** Отказаться от найденной копии и удалить её. */
    discardPending: () => void;

    status: AutosaveStatus;
};

function readPendingDraft(
    articleId: string | null,
    baseUpdatedAt: string | null,
    initialValue: NewArticle
): PendingArticleDraft | null {
    const stored = loadArticleDraft(articleId);

    // Копия, совпадающая с тем, что уже на сайте, ничего не восстанавливает.
    if (!stored || isSameArticleContent(stored.value, initialValue)) {
        return null;
    }

    return {
        value: stored.value,
        savedAt: stored.savedAt,
        isConflict: articleId !== null && stored.baseUpdatedAt !== baseUpdatedAt,
    };
}

/**
 * Автосохранение содержимого редактора статьи в браузере: текст не
 * теряется при закрытой вкладке, обновлении страницы или сбое
 * сохранения на сайте. Подробности про то, что и где хранится, — в
 * utils/articleDraftStorage.ts.
 *
 * Порядок работы:
 *  1. При открытии редактора ищет сохранённую копию. Если она есть и
 *     отличается от статьи на сайте, возвращает её как pendingDraft, а
 *     автосохранение ждёт решения: иначе пустая форма сразу
 *     перезаписала бы найденную копию.
 *  2. Пока форма отличается от исходной, через AUTOSAVE_DELAY_MS после
 *     последней правки пишет копию. Вернули всё как было — копия
 *     удаляется.
 *  3. При уходе со страницы (закрытие, смена вкладки, телефон
 *     "свернул" браузер) пишет копию сразу, не дожидаясь паузы.
 *  4. Если записать в хранилище не удалось, выставляет status "failed", и
 *     при закрытии вкладки браузер переспросит — это единственный
 *     случай, когда текст защищён только предупреждением.
 */
export function useArticleDraftAutosave({
    articleId,
    baseUpdatedAt,
    initialValue,
    draft,
    paused,
}: UseArticleDraftAutosaveParams): ArticleDraftAutosave {
    // Чтение хранилища при первом рендере: только чтение, без
    // побочных эффектов. Так не нужен эффект, который сразу после
    // открытия выставлял бы состояние.
    const [pendingDraft, setPendingDraft] = useState<PendingArticleDraft | null>(
        () => readPendingDraft(articleId, baseUpdatedAt, initialValue)
    );
    const [status, setStatus] = useState<AutosaveStatus>({ kind: "idle" });

    const isDirty = !isSameArticleContent(draft, initialValue);
    const active = pendingDraft === null && !paused;

    // Всегда пишет самое свежее содержимое формы, но не входит в
    // зависимости эффектов: иначе каждая буква пересоздавала бы
    // слушатели ухода со страницы.
    const saveNow = useEffectEvent(() => {
        if (!isDirty) {
            return;
        }

        const saved = saveArticleDraft(articleId, draft, baseUpdatedAt);

        setStatus(saved ? { kind: "saved", at: new Date() } : { kind: "failed" });
    });

    useEffect(() => {
        if (!active) {
            return;
        }

        if (!isDirty) {
            clearArticleDraft(articleId);

            return;
        }

        // draft — в зависимостях намеренно: каждая правка создаёт новый
        // объект и сбрасывает отсчёт паузы.
        const timer = setTimeout(saveNow, AUTOSAVE_DELAY_MS);

        return () => clearTimeout(timer);
    }, [active, isDirty, draft, articleId]);

    useEffect(() => {
        if (!active) {
            return;
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                saveNow();
            }
        }

        // visibilitychange срабатывает при закрытии и переключении
        // вкладки, а на телефонах — когда браузер сворачивают (там
        // pagehide не гарантирован). pagehide — на случай закрытия
        // окна и перехода по ссылке.
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", saveNow);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("pagehide", saveNow);
        };
    }, [active]);

    // Предупреждение браузера "Покинуть сайт?" нужно, только когда копию
    // сохранить не получилось. Когда автосохранение работает, оно
    // лишнее и только раздражает: текст и так не пропадёт.
    const needsUnloadWarning = isDirty && !paused && status.kind === "failed";

    useEffect(() => {
        if (!needsUnloadWarning) {
            return;
        }

        function warn(event: BeforeUnloadEvent) {
            event.preventDefault();
        }

        window.addEventListener("beforeunload", warn);

        return () => window.removeEventListener("beforeunload", warn);
    }, [needsUnloadWarning]);

    function restorePending(): NewArticle | null {
        const value = pendingDraft?.value ?? null;

        setPendingDraft(null);

        return value;
    }

    function discardPending() {
        clearArticleDraft(articleId);
        setPendingDraft(null);
    }

    return {
        isDirty,
        pendingDraft,
        restorePending,
        discardPending,
        // Статус относится к текущему содержимому: если форму вернули к
        // исходному, "сохранено в 14:32" уже ни о чём не говорит.
        status: isDirty ? status : { kind: "idle" },
    };
}
