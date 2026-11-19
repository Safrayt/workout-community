import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";
import DraftNotice from "../../components/DraftNotice/DraftNotice";
import Button from "../../components/ui/Button/Button";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import { useCurrentUser } from "../../context/CurrentUserContext";
import { useComplexes } from "../../context/ComplexContext";
import { formatRunDuration } from "../../utils/complexRunResult";
import {
    clearPendingComplexResult,
    parsePendingComplexResult,
    readPendingComplexResult,
    writePendingComplexResult,
    type PendingComplexResult,
} from "../../utils/pendingComplexResult";
import { useFormDraft } from "../../hooks/useFormDraft";
import {
    createEmptyWorkoutEntry,
    getWorkoutDraftKey,
    isWorkoutDraftEmpty,
    normalizeWorkoutDraft,
    parseWorkoutPrefill,
} from "../../utils/diaryDraft";

import { ApiError } from "../../api/errors";

/**
 * Новая запись о тренировке. Введённое автоматически сохраняется
 * черновиком на этом устройстве (см. hooks/useFormDraft.ts): его можно
 * продолжить после перехода на другую страницу или закрытия браузера.
 * Черновик удаляется после успешного сохранения записи или по кнопке
 * «Начать заново».
 *
 * Сюда можно перейти с готовой заготовкой записи (состояние адреса
 * workoutPrefill) — например, с итогом пройденной схемы программы
 * (pages/ProgramSchemeRun): тогда название, описание, программа, раздел
 * и схема уже заполнены. Если на устройстве есть несохранённый
 * черновик, сначала спрашиваем, заменять ли его.
 *
 * Если запись создаётся после прохождения комплекса с помощником
 * (состояние адреса complexCompletion), результат комплекса ждёт
 * сохранения записи — выполнение нужно привязать к ней, а записи ещё не
 * было. Над формой показывается, что именно добавится (и можно отказаться),
 * а после сохранения записи выполнение создаётся автоматически. Прежние
 * выполнения комплекса не затрагиваются: это ещё одна строка в истории.
 */
export default function AddWorkoutEntry() {
    const {
        addEntry,
    } = useWorkoutDiary();

    const navigate =
        useNavigate();

    const { currentUser } = useCurrentUser();
    const { addCompletion } = useComplexes();

    const draft = useFormDraft<NewWorkoutEntry>({
        storageKey: getWorkoutDraftKey(currentUser.id),
        createEmpty: createEmptyWorkoutEntry,
        normalize: normalizeWorkoutDraft,
        isEmpty: isWorkoutDraftEmpty,
    });

    const location = useLocation();
    const prefill = useMemo(
        () => parseWorkoutPrefill(location.state),
        [location.state]
    );
    const incomingComplexResult = useMemo(
        () => parsePendingComplexResult(location.state),
        [location.state]
    );
    const prefillHandledRef = useRef(false);

    // Результат комплекса из помощника, который добавится к этой записи.
    const [pendingResult, setPendingResult] =
        useState<PendingComplexResult | null>(() =>
            readPendingComplexResult(currentUser.id)
        );

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Ждём, пока загрузится черновик: от него зависит, спрашивать
        // ли подтверждение.
        if (!prefill || draft.initialValue === null || prefillHandledRef.current) {
            return;
        }

        prefillHandledRef.current = true;

        // Убираем заготовку из адреса, чтобы обновление страницы или
        // возврат на неё не подставили её второй раз.
        navigate(location.pathname, { replace: true, state: null });

        if (
            draft.isRestored &&
            !window.confirm(
                "На этом устройстве есть несохранённый черновик записи. " +
                "Заменить его записью о выполненной схеме? " +
                "Введённые в черновике данные и фотографии будут потеряны.\n\n" +
                "«Отмена» — оставить черновик."
            )
        ) {
            return;
        }

        // Результат комплекса сохраняем, только когда заготовка принята:
        // иначе он прикрепился бы к чужому черновику.
        if (incomingComplexResult) {
            writePendingComplexResult(currentUser.id, incomingComplexResult);
            setPendingResult(incomingComplexResult);
        }

        draft.replace({ ...createEmptyWorkoutEntry(), ...prefill });
    }, [
        prefill,
        incomingComplexResult,
        currentUser.id,
        draft,
        navigate,
        location.pathname,
    ]);

    async function handleSubmit(
        entry: NewWorkoutEntry
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            const created = await addEntry(entry);

            // Запись сохранена — черновик больше не нужен.
            await draft.markSubmitted();

            // Результат комплекса из помощника: ещё одно выполнение,
            // привязанное к только что созданной записи. Если не вышло —
            // запись всё равно сохранена, результат можно добавить на
            // странице комплекса.
            if (pendingResult) {
                try {
                    await addCompletion(pendingResult.complexId, {
                        complexId: pendingResult.complexId,
                        resultTimeSeconds: pendingResult.resultTimeSeconds,
                        resultReps: pendingResult.resultReps,
                        resultDurationSeconds: pendingResult.resultDurationSeconds,
                        resultSets: pendingResult.resultSets,
                        resultRounds: pendingResult.resultRounds,
                        resultCount: pendingResult.resultCount,
                        diaryEntryId: created.id,
                        completedDate: created.date,
                        viaAssistant: true,
                    });
                } catch (completionError: unknown) {
                    console.error(
                        "Не удалось добавить результат комплекса:",
                        completionError
                    );
                    window.alert(
                        "Запись сохранена, но результат комплекса «" +
                            pendingResult.complexName +
                            "» добавить не удалось. Добавьте его на странице " +
                            "комплекса."
                    );
                }

                clearPendingComplexResult(currentUser.id);
            }

            navigate("/diary");
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сохранить запись. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    async function handleDiscardDraft() {
        const confirmed = window.confirm(
            "Удалить черновик и начать заполнение заново? " +
            "Введённые данные и загруженные фотографии будут потеряны."
        );

        if (!confirmed) {
            return;
        }

        setError(null);
        clearPendingComplexResult(currentUser.id);
        setPendingResult(null);
        await draft.discard();
    }

    function handleDropPendingResult() {
        clearPendingComplexResult(currentUser.id);
        setPendingResult(null);
    }

    return (
        <div className="workout-entry-create">

            {/* Back Navigation (UX §4) */}
            <Link
                to="/diary/create"
                className="workout-entry-create__back"
            >
                ← Добавить запись
            </Link>

            {/* Hero (UX §5) — не должен занимать много места */}
            <header className="workout-entry-create__hero">
                <p className="workout-entry-create__eyebrow">
                    Дневник
                </p>

                <h1 className="workout-entry-create__title">
                    Новая запись
                </h1>

                <p className="workout-entry-create__subtitle">
                    Расскажи о своей тренировке
                </p>
            </header>

            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            {
                draft.initialValue === null ? (
                    <p className="playground-draft-hint">Загружаем…</p>
                ) : (
                    <>
                        <DraftNotice
                            isRestored={draft.isRestored}
                            onDiscard={handleDiscardDraft}
                            disabled={isSubmitting}
                        />

                        {
                            pendingResult && (
                                <div
                                    className="workout-entry-create__complex-result"
                                    role="status"
                                >
                                    <p>
                                        К этой записи добавится выполнение
                                        комплекса «{pendingResult.complexName}»
                                        {
                                            pendingResult.resultTimeSeconds !== undefined &&
                                                `, время ${formatRunDuration(pendingResult.resultTimeSeconds)}`
                                        }
                                        {
                                            pendingResult.resultReps !== undefined &&
                                                `, повторений ${pendingResult.resultReps}`
                                        }
                                        .
                                    </p>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDropPendingResult}
                                        disabled={isSubmitting}
                                    >
                                        Не добавлять результат
                                    </Button>
                                </div>
                            )
                        }

                        <WorkoutEntryForm
                            key={draft.formKey}
                            initialValue={draft.initialValue}
                            submitLabel={isSubmitting ? "Сохраняем…" : "Сохранить запись"}
                            onSubmit={handleSubmit}
                            onChange={draft.handleChange}
                            onCancel={() => navigate("/diary/create")}
                        />
                    </>
                )
            }

        </div>
    );
}
