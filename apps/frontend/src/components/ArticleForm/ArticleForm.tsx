import { useState } from "react";

import Input from "../ui/Input/Input";
import Select from "../ui/Select/Select";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";
import FormSection from "../ui/FormSection/FormSection";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import ArticleTagsField from "../ArticleTagsField/ArticleTagsField";
import MarkdownEditor from "../MarkdownEditor/MarkdownEditor";

import "../../styles/components/article-form.css";

import type { ArticleCategory, NewArticle } from "../../types/article";

import { listArticleTags, uploadArticleImage } from "../../api/articles";
import { resolveMediaUrl } from "../../api/media";
import { articleCategories } from "../../constants/articleCategories";
import { useArticleDraftAutosave } from "../../hooks/useArticleDraftAutosave";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import {
    formatDraftTime,
    MAX_ARTICLE_SUMMARY_LENGTH,
    MAX_ARTICLE_TITLE_LENGTH,
    validateArticleForm,
    type ArticleFormErrors,
} from "../../utils/articleForm";
import { prepareArticleImage } from "../../utils/articleImages";

type SaveAction = "publish" | "draft";

type ArticleFormProps = {
    initialValue: NewArticle;

    /**
     * Адрес редактируемой статьи; у новой — null. По нему редактор
     * находит и хранит автосохранённую копию (своя у каждой статьи).
     */
    articleId?: string | null;

    /**
     * updatedAt статьи на сайте на момент открытия формы (у новой —
     * null). Нужен, чтобы заметить, что статью изменили, пока копия
     * лежала в браузере.
     */
    baseUpdatedAt?: string | null;

    /** Статья уже опубликована (при редактировании). */
    isPublishedNow: boolean;

    isSubmitting?: boolean;

    /** Ошибка последней отправки — выводится над кнопками. */
    submitError?: string | null;

    /** Получает статью с уже выставленным isPublished. */
    onSubmit: (value: NewArticle) => void | Promise<void>;
    onCancel: () => void;
};

/**
 * Форма статьи (только для администратора): название, направленность,
 * краткое описание, хештеги, обложка и текст в Markdown-редакторе.
 *
 * Кнопок сохранения две, и они сами решают, опубликована статья или
 * нет: у новой — "Опубликовать" и "Сохранить черновик", у уже
 * опубликованной — "Сохранить" и "Снять с публикации". Так нет
 * отдельного переключателя, о котором легко забыть.
 */
export default function ArticleForm({
    initialValue,
    articleId = null,
    baseUpdatedAt = null,
    isPublishedNow,
    isSubmitting = false,
    submitError = null,
    onSubmit,
    onCancel,
}: ArticleFormProps) {
    const [draft, setDraft] = useState<NewArticle>(initialValue);
    const [errors, setErrors] = useState<ArticleFormErrors>({});
    const [lastAction, setLastAction] = useState<SaveAction | null>(null);

    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);

    const popularTags = useAsyncResource("popular-tags", () =>
        listArticleTags()
    );

    // Автосохранение копии в браузере: текст не теряется при закрытой
    // вкладке или сбое сохранения. Пока идёт отправка на сайт, копию не
    // трогаем (paused) — после успеха её удаляет страница.
    const autosave = useArticleDraftAutosave({
        articleId,
        baseUpdatedAt,
        initialValue,
        draft,
        paused: isSubmitting,
    });

    const pendingDraft = autosave.pendingDraft;

    function handleRestoreDraft() {
        const restored = autosave.restorePending();

        if (restored) {
            // Опубликована статья или нет, решает кнопка сохранения, а
            // не копия.
            setDraft({ ...restored, isPublished: initialValue.isPublished });
            setErrors({});
        }
    }

    function update<K extends keyof NewArticle>(
        field: K,
        value: NewArticle[K]
    ) {
        setDraft((previous) => ({ ...previous, [field]: value }));

        if (field in errors) {
            setErrors((previous) => ({ ...previous, [field]: undefined }));
        }
    }

    async function handleCoverPicked(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

        setCoverError(null);
        setIsCoverUploading(true);

        try {
            const prepared = await prepareArticleImage(file);

            update("coverUrl", await uploadArticleImage(prepared));
        } catch (error: unknown) {
            console.error("Не удалось загрузить обложку:", error);

            setCoverError(
                error instanceof Error
                    ? error.message
                    : "Не удалось загрузить обложку"
            );
        } finally {
            setIsCoverUploading(false);
        }
    }

    async function submit(action: SaveAction) {
        const value: NewArticle = {
            ...draft,
            title: draft.title.trim(),
            summary: draft.summary.trim(),
            body: draft.body.trim(),
            isPublished: action === "publish",
        };

        const nextErrors = validateArticleForm(value);

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setLastAction(action);

        await onSubmit(value);
    }

    const hasErrors = Object.values(errors).some(Boolean);
    const coverPreview = resolveMediaUrl(draft.coverUrl);

    const busy = isSubmitting || isCoverUploading;

    return (
        <form
            className="article-form"
            // Сохраняют только кнопки внизу: случайный Enter в поле
            // названия не должен публиковать статью.
            onSubmit={(event) => event.preventDefault()}
            noValidate
        >
            {pendingDraft && (
                <div className="article-form__restore" role="status">
                    <p className="article-form__restore-title">
                        Найдена несохранённая копия
                    </p>

                    <p className="article-form__restore-text">
                        {`Редактор сохранил её в этом браузере ${formatDraftTime(pendingDraft.savedAt)}`}
                        {pendingDraft.value.title.trim()
                            ? ` («${pendingDraft.value.title.trim()}»)`
                            : ""}
                        {". Восстановить её или "}
                        {articleId === null
                            ? "начать с чистого листа?"
                            : "продолжить с версии, которая сейчас на сайте?"}
                    </p>

                    {pendingDraft.isConflict && (
                        <p className="article-form__restore-warning">
                            Внимание: статью на сайте изменили после того, как
                            вы начали эту правку. Если восстановить копию и
                            сохранить, те изменения будут перезаписаны.
                        </p>
                    )}

                    <ActionGroup>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleRestoreDraft}
                        >
                            Восстановить копию
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={autosave.discardPending}
                        >
                            Удалить копию
                        </Button>
                    </ActionGroup>
                </div>
            )}

            {/* Пока не решено, что делать с найденной копией, поля
                заблокированы: набранное сейчас было бы перезаписано
                выбором. fieldset disabled блокирует все кнопки и поля
                внутри разом. */}
            <fieldset
                className="article-form__sections"
                disabled={pendingDraft !== null}
            >
                <FormSection title="Основное">
                    <div className="article-form__fields">
                        <Input
                            id="article-title"
                            label="Название"
                            value={draft.title}
                            maxLength={MAX_ARTICLE_TITLE_LENGTH + 20}
                            error={errors.title}
                            onChange={(event) =>
                                update("title", event.target.value)
                            }
                        />

                        <Select
                            id="article-category"
                            label="Направленность"
                            emptyOptionLabel="Выберите направленность"
                            options={articleCategories.map((category) => ({
                                value: category.key,
                                label: category.label,
                            }))}
                            value={draft.category}
                            error={errors.category}
                            onChange={(event) =>
                                update(
                                    "category",
                                    event.target.value as ArticleCategory | ""
                                )
                            }
                        />

                        <div>
                            <Textarea
                                id="article-summary"
                                label="Краткое описание"
                                rows={3}
                                value={draft.summary}
                                error={errors.summary}
                                onChange={(event) =>
                                    update("summary", event.target.value)
                                }
                            />

                            <p className="article-form__hint">
                                {`Показывается в списке статей под названием. ${draft.summary.length} / ${MAX_ARTICLE_SUMMARY_LENGTH}`}
                            </p>
                        </div>

                        <ArticleTagsField
                            tags={draft.tags}
                            suggestions={
                                popularTags.data ?? popularTags.previousData ?? []
                            }
                            onChange={(tags) => update("tags", tags)}
                        />
                    </div>
                </FormSection>

                <FormSection title="Обложка">
                    {coverPreview && (
                        <img
                            className="article-form__cover"
                            src={coverPreview}
                            alt="Обложка статьи"
                        />
                    )}

                    <div className="article-form__cover-actions">
                        <label
                            className={
                                "article-form__file-button" +
                                (isCoverUploading
                                    ? " article-form__file-button--busy"
                                    : "")
                            }
                        >
                            {isCoverUploading
                                ? "Загрузка…"
                                : coverPreview
                                  ? "Заменить обложку"
                                  : "Выбрать обложку"}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="article-form__file-input"
                                disabled={isCoverUploading}
                                onChange={handleCoverPicked}
                            />
                        </label>

                        {coverPreview && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isCoverUploading}
                                onClick={() => update("coverUrl", null)}
                            >
                                Убрать обложку
                            </Button>
                        )}
                    </div>

                    <p className="article-form__hint">
                        Необязательно. Лучше горизонтальная картинка (jpeg, png или
                        webp, до 5 МБ): она показывается в карточке статьи и над
                        текстом.
                    </p>

                    {coverError && (
                        <small className="article-form__error" role="alert">
                            {coverError}
                        </small>
                    )}
                </FormSection>

                <FormSection title="Текст статьи">
                    <MarkdownEditor
                        id="article-body"
                        label="Текст"
                        value={draft.body}
                        error={errors.body}
                        onChange={(body) => update("body", body)}
                        onUploadImage={uploadArticleImage}
                    />
                </FormSection>
            </fieldset>

            {hasErrors && (
                <p className="article-form__submit-error" role="alert">
                    Проверьте отмеченные поля.
                </p>
            )}

            {submitError && (
                <p className="article-form__submit-error" role="alert">
                    {submitError}
                </p>
            )}

            <ActionGroup>
                <Button
                    type="button"
                    variant="primary"
                    disabled={busy || pendingDraft !== null}
                    onClick={() => void submit("publish")}
                >
                    {isSubmitting && lastAction === "publish"
                        ? "Сохраняем…"
                        : isPublishedNow
                          ? "Сохранить"
                          : "Опубликовать"}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    disabled={busy || pendingDraft !== null}
                    onClick={() => void submit("draft")}
                >
                    {isSubmitting && lastAction === "draft"
                        ? "Сохраняем…"
                        : isPublishedNow
                          ? "Снять с публикации"
                          : "Сохранить черновик"}
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={onCancel}
                >
                    Отмена
                </Button>
            </ActionGroup>

            {autosave.status.kind === "saved" && (
                <p className="article-form__autosave" aria-live="polite">
                    {`Копия сохранена в этом браузере в ${autosave.status.at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}. На сайте статья пока не изменена.`}
                </p>
            )}

            {autosave.status.kind === "failed" && (
                <p
                    className="article-form__autosave article-form__autosave--failed"
                    role="alert"
                >
                    Не удалось сохранить копию в браузере. Не закрывайте
                    вкладку, пока не сохраните статью.
                </p>
            )}
        </form>
    );
}
