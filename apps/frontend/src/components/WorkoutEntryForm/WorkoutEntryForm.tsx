import Section from "../ui/Section/Section";
import Input from "../ui/Input/Input";
import RichTextarea from "../ui/RichTextarea/RichTextarea";
import Select from "../ui/Select/Select";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import WorkoutEntryPhotoUpload from "../WorkoutEntryPhotoUpload/WorkoutEntryPhotoUpload";
import TagsField from "../TagsField/TagsField";
import ProgramPartSelects from "./ProgramPartSelects";
import WorkoutEntryExercisesField from "../WorkoutEntryExercisesField/WorkoutEntryExercisesField";
import SchemeComposer from "../SchemeComposer/SchemeComposer";
import CollapsibleSection from "../ui/CollapsibleSection/CollapsibleSection";

import "../../styles/components/checkbox-grid.css";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
    ValidationError,
} from "../../validation";
import {
    validateWorkoutEntry,
} from "../../validation/workoutEntry";

import {
    getFieldError,
} from "../../utils/validation.ts";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    usePersonalTags,
} from "../../context/PersonalTagsContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    usePrograms,
} from "../../context/ProgramContext";

import { useExercises } from "../../context/ExerciseContext";

import type { ProgramBlock, ProgramScheme } from "../../types/program";

import {
    MAX_PERFORMED_EXERCISES,
    buildPerformedFromScheme,
} from "../../utils/performedExercises";
import {
    composerScheme,
    getComposerProblems,
    stripPendingItems,
} from "../../utils/schemeComposer";

import PlaygroundsMap from "../Map/LazyPlaygroundsMap";
import SelectedPlaygroundPreview from "../SelectedPlaygroundPreview/SelectedPlaygroundPreview";
import FavoritePlaygroundQuickPick from "../FavoritePlaygroundQuickPick/FavoritePlaygroundQuickPick";

import {
    useFavorites,
} from "../../context/FavoriteContext";

import {
    getRecentFavoritePlaygrounds,
} from "../../utils/favorites";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getPlaygroundMarkers,
} from "../../utils/maps";

import {
    timeOfDayOptions,
} from "../../utils/timeOfDay";

import {
    MAX_TAGS_PER_ENTRY,
} from "../../utils/workoutTags";

import {
    MAX_WORKOUT_ENTRY_PHOTOS,
} from "../../constants/workoutEntryPhotos";

import {
    getTodayDateString,
} from "../../utils/today";

import "../../styles/components/workout-entry-form.css";
import "../../styles/components/workout-entry-map-picker.css";

import type { ReactNode } from "react";

/** Сколько избранных площадок показывать для быстрого выбора. */
const FAVORITE_QUICK_PICK_LIMIT = 4;

type WorkoutEntryFormProps = {
    /**
     * Заголовок над формой (например, "Редактирование записи").
     * Используется только режимом редактирования — у страницы
     * создания записи свой Hero, живущий на уровне страницы (UX §5).
     */
    heading?: string;

    initialValue: NewWorkoutEntry;

    submitLabel: string;

    onSubmit: (entry: NewWorkoutEntry) => void;

    /**
     * Вызывается при каждом изменении формы (но не при открытии).
     * Страница создания по нему сохраняет черновик.
     */
    onChange?: (entry: NewWorkoutEntry) => void;

    /** Кнопка/действие "Отмена" (UX §24–25). */
    onCancel?: () => void;

    extraActions?: ReactNode;
};

/**
 * Форма записи дневника — используется и для создания (AddWorkoutEntry),
 * и для редактирования (WorkoutEntryDetails, режим edit) записи.
 *
 * Разбита на смысловые секции согласно UX-DIARY-CREATE §3, §23, §37:
 * "Когда" → "Тренировка" → "Место" → "Теги" → действия. Так форма
 * читается как последовательный рассказ о тренировке, а не как
 * длинная безликая анкета.
 */
export default function WorkoutEntryForm({
    heading,
    initialValue,
    submitLabel,
    onSubmit,
    onChange,
    onCancel,
    extraActions,
}: WorkoutEntryFormProps) {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [submitError, setSubmitError] =
        useState<string | null>(null);

    const [
        entry,
        setEntry,
    ] = useState<NewWorkoutEntry>(
        initialValue
    );

    // Сообщаем странице о каждом изменении формы — она сохраняет черновик.
    // Актуальный onChange держим в ref, чтобы эффект срабатывал только
    // от изменения данных, а не от новой функции на каждом рендере. Первый
    // рендер пропускаем: начальное значение — не правка пользователя.
    const onChangeRef = useRef(onChange);
    const isFirstRenderRef = useRef(true);

    useEffect(() => {
        onChangeRef.current = onChange;
    });

    useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }

        onChangeRef.current?.(entry);
    }, [entry]);

    const {
        currentUser,
    } = useCurrentUser();

    const {
        registerUsedTags,
        tags: personalTags,
    } = usePersonalTags();

    const {
        playgrounds,
    } = usePlaygrounds();

    const { programs } = usePrograms();

    const { getExerciseById } = useExercises();

    // Упражнения записи подставляются из выбранной схемы (считаем, что
    // тренировка прошла по ней), пока человек их сам не правил.
    // appliedSchemeRef — схема, из которой они уже подставлены (у
    // существующей записи упражнения заданы ею, повторно не трогаем);
    // autoFilledRef — список целиком из схемы и не правился вручную,
    // поэтому при смене или сбросе схемы его можно заменить.
    const appliedSchemeRef = useRef<string | undefined>(
        initialValue.programVersionId
            ? initialValue.programSchemeId
            : undefined
    );
    const autoFilledRef = useRef(false);

    // Блок свёрнут, пока в нём ничего нет; раскрывается, когда
    // появляются упражнения (и дальше сам не закрывается).
    const [exercisesOpen, setExercisesOpen] = useState(
        initialValue.exercises.length > 0
    );

    useEffect(() => {
        if (entry.exercises.length > 0) {
            setExercisesOpen(true);
        }
    }, [entry.exercises.length]);

    useEffect(() => {
        if (entry.programSchemeId) {
            return;
        }

        appliedSchemeRef.current = undefined;

        if (autoFilledRef.current) {
            autoFilledRef.current = false;
            setEntry((current) => ({ ...current, exercises: [] }));
        }
    }, [entry.programSchemeId]);

    // Конструктор схемы: схема собирается здесь, а в запись попадают
    // только выполненные упражнения (см. applyComposedScheme).
    const [composerOpen, setComposerOpen] = useState(false);
    const [composerBlocks, setComposerBlocks] = useState<ProgramBlock[]>([]);

    const composerBlocksReady = stripPendingItems(composerBlocks);
    const composerCanApply =
        composerBlocksReady.length > 0 &&
        getComposerProblems(composerBlocks).length === 0;

    function closeComposer() {
        setComposerOpen(false);
        setComposerBlocks([]);
    }

    /**
     * Числа составленной схемы становятся выполненными упражнениями
     * (как при выборе схемы программы: считаем, что всё выполнено
     * так, поправить можно ниже). Если список пуст или подставлен
     * автоматически, схема его заменяет, иначе — дописывается.
     */
    function applyComposedScheme() {
        const composed = buildPerformedFromScheme(
            composerScheme(composerBlocksReady),
            (exerciseId) => getExerciseById(exerciseId)?.name
        );

        const replace = entry.exercises.length === 0 || autoFilledRef.current;

        autoFilledRef.current = false;

        updateField(
            "exercises",
            (replace ? composed : [...entry.exercises, ...composed]).slice(
                0,
                MAX_PERFORMED_EXERCISES
            )
        );

        closeComposer();
    }

    function handleSchemeResolved(scheme: ProgramScheme) {
        if (appliedSchemeRef.current === scheme.id) {
            return;
        }

        appliedSchemeRef.current = scheme.id;

        // Уже вписанное вручную не затираем.
        if (entry.exercises.length > 0 && !autoFilledRef.current) {
            return;
        }

        autoFilledRef.current = true;

        updateField(
            "exercises",
            buildPerformedFromScheme(
                scheme,
                (exerciseId) => getExerciseById(exerciseId)?.name
            )
        );
    }

    const { favorites } = useFavorites();

    // Площадка, к которой нужно приблизить карту, и номер запроса:
    // номер растёт при каждом нажатии, поэтому повторное нажатие на
    // ту же площадку (после того как карту увели в сторону) снова
    // возвращает к ней.
    const [focusPlaygroundId, setFocusPlaygroundId] =
        useState<string>();
    const [focusRequestId, setFocusRequestId] = useState(0);

    // Быстрый выбор: 4 последние добавленные в избранное площадки.
    const quickPickPlaygrounds = getRecentFavoritePlaygrounds(
        playgrounds,
        favorites,
        currentUser.id,
        FAVORITE_QUICK_PICK_LIMIT
    );

    function handleQuickPick(playgroundId: string) {
        // Повторное нажатие на уже выбранную площадку отменяет выбор.
        if (entry.playgroundId === playgroundId) {
            updateField("playgroundId", "");
            setFocusPlaygroundId(undefined);

            return;
        }

        updateField("playgroundId", playgroundId);
        setFocusPlaygroundId(playgroundId);
        setFocusRequestId((current) => current + 1);
    }

    const favoritePrograms = programs.filter(
        (program) => program.isFavoritedByViewer
    );

    // Если у уже существующей записи указана программа, которую с тех
    // пор убрали из избранного — не прячем её из списка молча (иначе
    // при редактировании старой записи выбор выглядел бы пустым и его
    // случайно можно было бы стереть), а просто добавляем отдельно.
    const selectedProgramOutsideFavorites =
        entry.programId &&
        !favoritePrograms.some((program) => program.id === entry.programId)
            ? programs.find((program) => program.id === entry.programId)
            : undefined;

    const programOptions = [
        ...favoritePrograms,
        ...(selectedProgramOutsideFavorites ? [selectedProgramOutsideFavorites] : []),
    ].map((program) => ({
        value: program.id,
        label: program.title,
    }));

    // Раздел и схему предлагаем из структуры той версии программы, на
    // которой записана тренировка: у существующей записи с прежней
    // программой — из её сохранённой версии (запись не «переезжает» на
    // новую), иначе — из текущей опубликованной версии выбранной программы.
    const programVersionIdForParts =
        entry.programId &&
        entry.programId === initialValue.programId &&
        initialValue.programVersionId
            ? initialValue.programVersionId
            : programs.find((program) => program.id === entry.programId)
                  ?.currentVersionId;

    // Метки считаем один раз на набор площадок: новый массив при
    // каждом рендере формы заставлял бы карту заново пересобирать
    // содержимое всех попапов после любого нажатия клавиши в форме.
    const playgroundMarkers = useMemo(
        () => getPlaygroundMarkers(playgrounds),
        [playgrounds]
    );

    const selectedPlayground =
        entry.playgroundId
            ? getPlaygroundById(
                playgrounds,
                entry.playgroundId
            )
            : undefined;

    // Источник — личный справочник тегов (PersonalTagsContext), а
    // не только теги, реально встречающиеся в записях. Иначе тег,
    // созданный на странице "Мои теги" без единого использования,
    // не появился бы здесь для выбора.
    const existingTags =
        personalTags
            .filter((tag) => tag.userId === currentUser.id)
            .map((tag) => tag.name)
            .sort((a, b) => a.localeCompare(b, "ru"));

    function updateField<K extends keyof NewWorkoutEntry>(
        field: K,
        value: NewWorkoutEntry[K]
    ) {
        setEntry(
            (current) => ({
                ...current,
                [field]: value,
            })
        );

        setErrors(
            (current) =>
                current.filter(
                    (error) =>
                        error.field !== field
                )
        );
    }

    function handleSubmit() {
        const result =
            validateWorkoutEntry(entry);

        if (!result.valid) {
            setErrors(
                result.errors
            );

            return;
        }

        setErrors([]);

        // Форма не должна очищаться при ошибке сохранения — все
        // введённые данные остаются на месте (UX §27).
        try {
            setSubmitError(null);
            onSubmit(entry);

            // Теги, введённые прямо здесь (минуя "Мои теги"),
            // всё равно должны попасть в личный справочник тегов
            // пользователя (UX-PERSONAL-TAGS §39, §47).
            registerUsedTags(
                currentUser.id,
                entry.tags
            );
        } catch {
            setSubmitError(
                "Не удалось сохранить запись. Попробуйте ещё раз."
            );
        }
    }

    return (
        <div className="workout-entry-form">

            {
                heading && (
                    <h1 className="workout-entry-form__heading">
                        {heading}
                    </h1>
                )
            }

            <Section title="Когда">
                <Input
                    id="date"
                    label="Дата"
                    type="date"
                    className="input__field--date"
                    max={getTodayDateString()}
                    value={entry.date}
                    error={
                        getFieldError(
                            errors,
                            "date"
                        )
                    }
                    onChange={(e) =>
                        updateField(
                            "date",
                            e.target.value
                        )
                    }
                />

                <Select
                    id="timeOfDay"
                    label="Время суток"
                    emptyOptionLabel="Не указано"
                    options={timeOfDayOptions}
                    value={entry.timeOfDay}
                    onChange={(e) =>
                        updateField(
                            "timeOfDay",
                            e.target.value
                        )
                    }
                />
            </Section>

            <Section title="Тренировка">
                <Input
                    id="title"
                    label="Название"
                    placeholder="Например, Утренняя тренировка"
                    value={entry.title}
                    error={
                        getFieldError(
                            errors,
                            "title"
                        )
                    }
                    onChange={(e) =>
                        updateField(
                            "title",
                            e.target.value
                        )
                    }
                />

                <RichTextarea
                    id="description"
                    label="Что делал?"
                    placeholder="Расскажи, как прошла тренировка"
                    value={entry.description}
                    onChange={(value) =>
                        updateField(
                            "description",
                            value
                        )
                    }
                />

                <div className="input">
                    <label className="input__label">
                        Фотографии (необязательно)
                    </label>

                    <WorkoutEntryPhotoUpload
                        photos={entry.photos}
                        maxPhotos={MAX_WORKOUT_ENTRY_PHOTOS}
                        error={
                            getFieldError(
                                errors,
                                "photos"
                            )
                        }
                        onChange={(photos) =>
                            updateField(
                                "photos",
                                photos
                            )
                        }
                    />
                </div>
            </Section>

            <Section title="Программа тренировок">
                <p className="workout-entry-form__section-lead">
                    необязательно
                </p>

                <Select
                    id="programId"
                    label="Программы в избранном"
                    emptyOptionLabel="Не указана"
                    options={programOptions}
                    value={entry.programId}
                    onChange={(e) => {
                        updateField("programId", e.target.value);
                        // Раздел и схема принадлежат конкретной программе
                        // (UX-документ «Раздел Программы», п.5): при смене
                        // или сбросе программы выбор очищаем.
                        updateField("programSection", "");
                        updateField("programScheme", "");
                        updateField("programSectionId", "");
                        updateField("programSchemeId", "");
                    }}
                />

                {
                    entry.programId && (
                        <ProgramPartSelects
                            programId={entry.programId}
                            versionId={programVersionIdForParts}
                            sectionId={entry.programSectionId ?? ""}
                            schemeId={entry.programSchemeId ?? ""}
                            legacySection={entry.programSection ?? ""}
                            legacyScheme={entry.programScheme ?? ""}
                            onChange={(patch) =>
                                setEntry((current) => ({
                                    ...current,
                                    ...patch,
                                }))
                            }
                            onSchemeResolved={handleSchemeResolved}
                        />
                    )
                }
            </Section>

            <Section title="Схема тренировки">
                <p className="workout-entry-form__section-lead">
                    Необязательно. Составьте схему или впишите упражнения
                    и подходы: по ним считается ваш прогресс. Текст записи
                    они не заменяют.
                </p>

                <CollapsibleSection
                    title="Составить схему или указать упражнения"
                    defaultOpen={exercisesOpen}
                >
                    {
                        autoFilledRef.current && entry.exercises.length > 0 && (
                            <p className="workout-entry-form__section-lead">
                                Подставлено из выбранной схемы: считаем, что
                                вы выполнили её так. Если было иначе —
                                исправьте числа.
                            </p>
                        )
                    }

                    {composerOpen ? (
                        <div className="workout-entry-form__composer">
                            <SchemeComposer
                                value={composerBlocks}
                                onChange={setComposerBlocks}
                            />

                            <div className="workout-entry-form__composer-actions">
                                <Button
                                    type="button"
                                    disabled={!composerCanApply}
                                    onClick={applyComposedScheme}
                                >
                                    Указать результаты
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeComposer}
                                >
                                    Отмена
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="workout-entry-form__composer-open">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setComposerOpen(true)}
                            >
                                Составить схему
                            </Button>
                        </div>
                    )}

                    <WorkoutEntryExercisesField
                        value={entry.exercises}
                        onChange={(exercises) => {
                            autoFilledRef.current = false;
                            updateField("exercises", exercises);
                        }}
                    />
                </CollapsibleSection>
            </Section>

            <Section title="Где тренировался?">
                <p className="workout-entry-form__section-lead">
                    Площадка (необязательно)
                </p>

                <div className="workout-entry-map">
                    <PlaygroundsMap
                        markers={playgroundMarkers}
                        height="var(--workout-entry-map-height, 350px)"
                        showDetailsLink={false}
                        selectedLatitude={
                            selectedPlayground?.coordinates.latitude
                        }
                        selectedLongitude={
                            selectedPlayground?.coordinates.longitude
                        }
                        focusMarkerId={focusPlaygroundId}
                        focusRequestId={focusRequestId}
                        onMarkerClick={(marker) =>
                            updateField(
                                "playgroundId",
                                marker.id
                            )
                        }
                    />
                </div>

                <FavoritePlaygroundQuickPick
                    playgrounds={quickPickPlaygrounds}
                    selectedPlaygroundId={entry.playgroundId}
                    onSelect={(playground) =>
                        handleQuickPick(playground.id)
                    }
                />

                {
                    selectedPlayground ? (
                        <div className="workout-entry-selected-playground">
                            <SelectedPlaygroundPreview
                                playground={selectedPlayground}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    updateField(
                                        "playgroundId",
                                        ""
                                    )
                                }
                            >
                                Убрать
                            </Button>
                        </div>
                    ) : (
                        <p className="workout-entry-selected-playground__hint">
                            Нажмите на площадку на карте или выберите
                            из избранного, чтобы выбрать её
                        </p>
                    )
                }
            </Section>

            <Section title="Теги">
                <TagsField
                    tags={entry.tags}
                    existingTags={existingTags}
                    maxTags={MAX_TAGS_PER_ENTRY}
                    onChange={(tags) =>
                        updateField("tags", tags)
                    }
                />
            </Section>

            <Section title="Приватность">
                <div className="checkbox-grid">
                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={entry.hideFromFeed}
                            onChange={(event) =>
                                updateField("hideFromFeed", event.target.checked)
                            }
                        />
                        Не публиковать в общей ленте
                    </label>

                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={entry.isPrivate}
                            onChange={(event) =>
                                updateField("isPrivate", event.target.checked)
                            }
                        />
                        Запись видна только мне
                    </label>
                </div>

                {
                    entry.isPrivate && (
                        <p className="workout-entry-form__privacy-hint">
                            Эту запись не увидит никто, кроме вас — ни в
                            ленте, ни на странице вашего дневника.
                        </p>
                    )
                }
            </Section>

            {
                submitError && (
                    <p className="workout-entry-form__submit-error">
                        {submitError}
                    </p>
                )
            }

            <div className="workout-entry-form__actions">
                <ActionGroup>
                    <Button
                        onClick={handleSubmit}
                    >
                        {submitLabel}
                    </Button>

                    {
                        onCancel && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onCancel}
                            >
                                Отмена
                            </Button>
                        )
                    }

                    {extraActions}
                </ActionGroup>
            </div>

        </div>
    );
}
