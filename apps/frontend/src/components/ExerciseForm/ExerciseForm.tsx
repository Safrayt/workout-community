import { useEffect, useRef, useState } from "react";

import Input from "../ui/Input/Input";
import Select from "../ui/Select/Select";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";
import FormSection from "../ui/FormSection/FormSection";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import MuscleMap from "../MuscleMap/MuscleMap";
import MuscleMapLegend from "../MuscleMapLegend/MuscleMapLegend";

import "../../styles/components/exercise-filters.css";
import "../../styles/components/exercise-form.css";

import type { MovementType, MuscleGroupKey } from "../../types/exercise";
import {
    NO_MEDIA_CHANGES,
    type ExerciseMediaChanges,
    type NewExercise,
} from "../../types/newExercise";

import { movementTypes } from "../../constants/movementTypes";
import { muscleGroups } from "../../constants/muscleGroups";

import { compressImageFile, dataUrlToFile } from "../../utils/files";
import {
    itemsToLines,
    linesToItems,
    validateExerciseForm,
    type ExerciseFormErrors,
} from "../../utils/exerciseForm";
import { toggleItem } from "../../utils/exerciseFilters";

// Должно совпадать с MAX_VIDEO_SIZE_BYTES в app/files.py.
const MAX_VIDEO_SIZE_MB = 25;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

/**
 * Поля формы. Списки (оборудование, преимущества, шаги техники и т. д.)
 * редактируются как обычный текст "один пункт на строку" — так удобно
 * вставлять готовые описания целиком; в список они превращаются при
 * отправке (linesToItems).
 */
type Draft = {
    name: string;
    nameEn: string;
    movementType: MovementType | "";
    targetMuscles: MuscleGroupKey[];
    auxiliaryMuscles: MuscleGroupKey[];
    equipment: string;
    description: string;
    advantages: string;
    disadvantages: string;
    technique: string;
    features: string;
    suitableFor: string;
};

function toDraft(value: NewExercise): Draft {
    return {
        name: value.name,
        nameEn: value.nameEn,
        movementType: value.movementType,
        targetMuscles: value.targetMuscles,
        auxiliaryMuscles: value.auxiliaryMuscles,
        equipment: itemsToLines(value.equipment),
        description: value.description,
        advantages: itemsToLines(value.advantages),
        disadvantages: itemsToLines(value.disadvantages),
        technique: itemsToLines(value.technique),
        features: itemsToLines(value.features),
        suitableFor: itemsToLines(value.suitableFor),
    };
}

function fromDraft(draft: Draft): NewExercise {
    return {
        name: draft.name.trim(),
        nameEn: draft.nameEn.trim(),
        movementType: draft.movementType,
        targetMuscles: draft.targetMuscles,
        auxiliaryMuscles: draft.auxiliaryMuscles,
        equipment: linesToItems(draft.equipment),
        description: draft.description.trim(),
        advantages: linesToItems(draft.advantages),
        disadvantages: linesToItems(draft.disadvantages),
        technique: linesToItems(draft.technique),
        features: linesToItems(draft.features),
        suitableFor: linesToItems(draft.suitableFor),
    };
}

/** Выбранный, но ещё не загруженный файл и адрес для его предпросмотра. */
type PickedFile = {
    file: File;
    previewUrl: string;
};

type ExerciseFormProps = {
    initialValue: NewExercise;

    /** Фото и видео, которые у упражнения уже есть (при редактировании). */
    currentPhotoUrl?: string;
    currentVideoUrl?: string;

    submitLabel: string;
    isSubmitting?: boolean;

    /** Ошибка последней отправки — выводится над кнопками. */
    submitError?: string | null;

    onSubmit: (
        value: NewExercise,
        media: ExerciseMediaChanges
    ) => void | Promise<void>;
    onCancel: () => void;
};

/**
 * Форма добавления и редактирования упражнения (только для
 * администратора). Повторяет страницу упражнения: все её блоки, фото и
 * видео. Фото и видео не отправляются вместе с текстом — форма отдаёт
 * выбранные файлы вызывающей странице, а та загружает их отдельными
 * запросами после сохранения текста (см. utils/exerciseMedia.ts).
 */
export default function ExerciseForm({
    initialValue,
    currentPhotoUrl,
    currentVideoUrl,
    submitLabel,
    isSubmitting = false,
    submitError = null,
    onSubmit,
    onCancel,
}: ExerciseFormProps) {
    const [draft, setDraft] = useState<Draft>(() => toDraft(initialValue));
    const [errors, setErrors] = useState<ExerciseFormErrors>({});

    const [photo, setPhoto] = useState<PickedFile | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const [video, setVideo] = useState<PickedFile | null>(null);
    const [removeVideo, setRemoveVideo] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    // Адреса предпросмотра создаются вручную (URL.createObjectURL) и
    // должны освобождаться: при замене файла и при уходе со страницы.
    const previewUrlsRef = useRef<string[]>([]);

    useEffect(() => {
        const urls = previewUrlsRef;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    function makePreviewUrl(file: File): string {
        const url = URL.createObjectURL(file);

        previewUrlsRef.current.push(url);

        return url;
    }

    function releasePreviewUrl(url: string | undefined) {
        if (!url) return;

        URL.revokeObjectURL(url);
        previewUrlsRef.current = previewUrlsRef.current.filter(
            (current) => current !== url
        );
    }

    function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function toggleTarget(muscle: MuscleGroupKey) {
        setDraft((current) => {
            const isAdding = !current.targetMuscles.includes(muscle);

            return {
                ...current,
                targetMuscles: toggleItem(current.targetMuscles, muscle),
                // Мышца не может быть сразу и целевой, и вспомогательной:
                // при выборе целевой она уходит из вспомогательных.
                auxiliaryMuscles: isAdding
                    ? current.auxiliaryMuscles.filter((item) => item !== muscle)
                    : current.auxiliaryMuscles,
            };
        });
    }

    async function handlePhotoPicked(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        // Сбрасываем значение, чтобы тот же файл можно было выбрать снова.
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Выберите файл с изображением (jpeg, png или webp).");
            return;
        }

        try {
            // Большие фото с телефона уменьшаем в браузере, чтобы не
            // упереться в лимит сервера (5 МБ) и не гонять лишние мегабайты.
            const compressed = dataUrlToFile(
                await compressImageFile(file),
                file.name.replace(/\.[^.]+$/, "") + ".jpg"
            );

            releasePreviewUrl(photo?.previewUrl);
            setPhoto({ file: compressed, previewUrl: makePreviewUrl(compressed) });
            setRemovePhoto(false);
            setPhotoError(null);
        } catch (error: unknown) {
            console.error("Не удалось обработать фото:", error);

            setPhotoError("Не удалось обработать изображение. Попробуйте другое.");
        }
    }

    function handleVideoPicked(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        // Часть браузеров не заполняет type — тогда смотрим на расширение.
        const looksLikeMp4 =
            file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");

        if (!looksLikeMp4) {
            setVideoError("Нужен файл в формате MP4 (H.264).");
            return;
        }

        if (file.size > MAX_VIDEO_SIZE_BYTES) {
            setVideoError(
                `Видео слишком большое: максимум ${MAX_VIDEO_SIZE_MB} МБ. Сожмите его перед загрузкой.`
            );
            return;
        }

        releasePreviewUrl(video?.previewUrl);
        setVideo({ file, previewUrl: makePreviewUrl(file) });
        setRemoveVideo(false);
        setVideoError(null);
    }

    function dropPhoto() {
        releasePreviewUrl(photo?.previewUrl);
        setPhoto(null);
        setPhotoError(null);

        // Было ли фото у упражнения до этого — если да, его нужно убрать.
        setRemovePhoto(currentPhotoUrl !== undefined);
    }

    function dropVideo() {
        releasePreviewUrl(video?.previewUrl);
        setVideo(null);
        setVideoError(null);
        setRemoveVideo(currentVideoUrl !== undefined);
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const value = fromDraft(draft);
        const found = validateExerciseForm(value);

        setErrors(found);

        if (Object.keys(found).length > 0) {
            // Поле с ошибкой может быть далеко от кнопки — прокручиваем к
            // первому такому блоку.
            document
                .querySelector("[aria-invalid='true'], .exercise-form__error")
                ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            return;
        }

        await onSubmit(value, {
            ...NO_MEDIA_CHANGES,
            photoFile: photo?.file ?? null,
            removePhoto,
            videoFile: video?.file ?? null,
            removeVideo,
        });
    }

    const shownPhotoUrl = photo
        ? photo.previewUrl
        : removePhoto
            ? undefined
            : currentPhotoUrl;
    const shownVideoUrl = video
        ? video.previewUrl
        : removeVideo
            ? undefined
            : currentVideoUrl;

    return (
        <form className="exercise-form" onSubmit={handleSubmit} noValidate>
            <FormSection title="Основное">
                <div className="exercise-form__fields">
                    <Input
                        id="exercise-name"
                        label="Название *"
                        value={draft.name}
                        error={errors.name}
                        maxLength={200}
                        onChange={(event) => updateDraft("name", event.target.value)}
                    />

                    <Input
                        id="exercise-name-en"
                        label="Название на английском"
                        value={draft.nameEn}
                        error={errors.nameEn}
                        lang="en"
                        maxLength={200}
                        onChange={(event) => updateDraft("nameEn", event.target.value)}
                    />

                    <Select
                        id="exercise-movement-type"
                        label="Тип движения *"
                        value={draft.movementType}
                        error={errors.movementType}
                        options={movementTypes.map((type) => ({
                            value: type.key,
                            label: type.label,
                        }))}
                        onChange={(event) =>
                            updateDraft(
                                "movementType",
                                event.target.value as MovementType | ""
                            )
                        }
                    />

                    <div>
                        <Textarea
                            id="exercise-equipment"
                            label="Оборудование *"
                            rows={2}
                            value={draft.equipment}
                            error={errors.equipment}
                            onChange={(event) =>
                                updateDraft("equipment", event.target.value)
                            }
                        />

                        <p className="exercise-form__hint">
                            Один вариант на строку, например: «Турник» или
                            «Без оборудования».
                        </p>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Мышцы">
                <div className="exercise-form__muscles">
                    <div className="exercise-form__muscles-fields">
                        <div>
                            <h4 className="exercise-form__subtitle">
                                Целевые мышцы *
                            </h4>

                            <div className="exercise-form__chips">
                                {
                                    muscleGroups.map((group) => {
                                        const isActive = draft.targetMuscles.includes(group.key);

                                        return (
                                            <button
                                                key={group.key}
                                                type="button"
                                                className={
                                                    "filter-chip" +
                                                    (isActive ? " filter-chip--active" : "")
                                                }
                                                aria-pressed={isActive}
                                                title={group.fullName}
                                                onClick={() => toggleTarget(group.key)}
                                            >
                                                {group.label}
                                            </button>
                                        );
                                    })
                                }
                            </div>

                            {
                                errors.targetMuscles && (
                                    <small className="exercise-form__error">
                                        {errors.targetMuscles}
                                    </small>
                                )
                            }
                        </div>

                        <div>
                            <h4 className="exercise-form__subtitle">
                                Вспомогательные мышцы
                            </h4>

                            <div className="exercise-form__chips">
                                {
                                    muscleGroups.map((group) => {
                                        const isTarget = draft.targetMuscles.includes(group.key);
                                        const isActive = draft.auxiliaryMuscles.includes(group.key);

                                        return (
                                            <button
                                                key={group.key}
                                                type="button"
                                                className={
                                                    "filter-chip" +
                                                    (isActive ? " filter-chip--active" : "")
                                                }
                                                aria-pressed={isActive}
                                                disabled={isTarget}
                                                title={
                                                    isTarget
                                                        ? "Эта мышца уже выбрана как целевая"
                                                        : group.fullName
                                                }
                                                onClick={() =>
                                                    updateDraft(
                                                        "auxiliaryMuscles",
                                                        toggleItem(draft.auxiliaryMuscles, group.key)
                                                    )
                                                }
                                            >
                                                {group.label}
                                            </button>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <div className="exercise-form__muscles-preview">
                        <MuscleMap
                            targetMuscles={draft.targetMuscles}
                            auxiliaryMuscles={draft.auxiliaryMuscles}
                        />

                        <MuscleMapLegend
                            items={["target", "auxiliary"]}
                        />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Описание">
                <div className="exercise-form__fields">
                    <Textarea
                        id="exercise-description"
                        label="Что это такое? *"
                        rows={4}
                        value={draft.description}
                        error={errors.description}
                        onChange={(event) =>
                            updateDraft("description", event.target.value)
                        }
                    />

                    <p className="exercise-form__hint">
                        Остальные блоки — по одному пункту на строку. Маркеры
                        («●», «-») и номера («1.») из готового текста можно не
                        убирать: сайт уберёт их сам, а шаги пронумерует заново.
                    </p>

                    <Textarea
                        id="exercise-advantages"
                        label="Преимущества"
                        rows={4}
                        value={draft.advantages}
                        error={errors.advantages}
                        onChange={(event) =>
                            updateDraft("advantages", event.target.value)
                        }
                    />

                    <Textarea
                        id="exercise-disadvantages"
                        label="Недостатки"
                        rows={3}
                        value={draft.disadvantages}
                        error={errors.disadvantages}
                        onChange={(event) =>
                            updateDraft("disadvantages", event.target.value)
                        }
                    />

                    <Textarea
                        id="exercise-technique"
                        label="Техника выполнения *"
                        rows={6}
                        value={draft.technique}
                        error={errors.technique}
                        onChange={(event) =>
                            updateDraft("technique", event.target.value)
                        }
                    />

                    <Textarea
                        id="exercise-features"
                        label="Особенности"
                        rows={3}
                        value={draft.features}
                        error={errors.features}
                        onChange={(event) =>
                            updateDraft("features", event.target.value)
                        }
                    />

                    <Textarea
                        id="exercise-suitable-for"
                        label="Для кого подходит"
                        rows={3}
                        value={draft.suitableFor}
                        error={errors.suitableFor}
                        onChange={(event) =>
                            updateDraft("suitableFor", event.target.value)
                        }
                    />
                </div>
            </FormSection>

            <FormSection title="Фото и видео">
                <div className="exercise-form__media">
                    <div className="exercise-form__media-block">
                        <h4 className="exercise-form__subtitle">Фото выполнения</h4>

                        {
                            shownPhotoUrl && (
                                <img
                                    className="exercise-form__photo-preview"
                                    src={shownPhotoUrl}
                                    alt="Предпросмотр фото"
                                />
                            )
                        }

                        <div className="exercise-form__media-actions">
                            <label className="exercise-form__file-button">
                                {shownPhotoUrl ? "Заменить фото" : "Выбрать фото"}

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="exercise-form__file-input"
                                    onChange={handlePhotoPicked}
                                />
                            </label>

                            {
                                shownPhotoUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={dropPhoto}
                                    >
                                        Убрать фото
                                    </Button>
                                )
                            }
                        </div>

                        <p className="exercise-form__hint">
                            Большое фото будет уменьшено автоматически. На
                            карточке упражнения оно показывается рядом со схемой
                            мышц.
                        </p>

                        {
                            photoError && (
                                <small className="exercise-form__error">{photoError}</small>
                            )
                        }
                    </div>

                    <div className="exercise-form__media-block">
                        <h4 className="exercise-form__subtitle">Видео выполнения</h4>

                        {
                            shownVideoUrl && (
                                <video
                                    className="exercise-form__video-preview"
                                    src={shownVideoUrl}
                                    controls
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                />
                            )
                        }

                        <div className="exercise-form__media-actions">
                            <label className="exercise-form__file-button">
                                {shownVideoUrl ? "Заменить видео" : "Выбрать видео"}

                                <input
                                    type="file"
                                    accept="video/mp4"
                                    className="exercise-form__file-input"
                                    onChange={handleVideoPicked}
                                />
                            </label>

                            {
                                shownVideoUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={dropVideo}
                                    >
                                        Убрать видео
                                    </Button>
                                )
                            }
                        </div>

                        <p className="exercise-form__hint">
                            Вертикальное видео MP4 (H.264), до {MAX_VIDEO_SIZE_MB} МБ,
                            лучше 5–20 секунд: на сайте оно идёт без звука и по
                            кругу. Тяжёлый ролик стоит сначала сжать.
                        </p>

                        {
                            videoError && (
                                <small className="exercise-form__error">{videoError}</small>
                            )
                        }
                    </div>
                </div>
            </FormSection>

            {
                submitError && (
                    <p className="exercise-form__submit-error" role="alert">
                        {submitError}
                    </p>
                )
            }

            <ActionGroup>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? "Сохраняем…" : submitLabel}
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={onCancel}
                >
                    Отмена
                </Button>
            </ActionGroup>
        </form>
    );
}
