import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "../../components/ui/Button/Button";
import ComplexRunResult from "../../components/ComplexRunResult/ComplexRunResult";

import "../../styles/components/program-scheme-run.css";

import { useExercises } from "../../context/ExerciseContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useProgramScheme } from "../../hooks/useProgramScheme";
import { useWakeLock } from "../../hooks/useWakeLock";
import type { Complex } from "../../types/complex";
import type { Exercise } from "../../types/exercise";
import {
    buildRunResultFields,
    pickManualFields,
    validateManualResult,
    type ManualResultFields,
} from "../../utils/complexRunResult";
import type { WorkoutEntryPrefill } from "../../types/newWorkoutEntry";
import type { ProgramBlockItem, ProgramScheme } from "../../types/program";
import {
    MAX_RESULT,
    buildRunDescription,
    buildRunSteps,
    completeWork,
    createRun,
    extendRest,
    formatClock,
    goToNextStep,
    parseRunState,
    resultUnit,
    restRemainingSeconds,
    runStorageKey,
    setStepReps,
    setStepResult,
    startTimedWork,
    isTimedKind,
    isRepsOnlyTimedKind,
    advanceEmom,
    emomContinues,
    emomPanel,
    emomRepsFor,
    computeRunTotals,
    describeStepName,
    setTogetherReps,
    setEmomReps,
    type EmomPanelEntry,
    totalRestSeconds,
    type RunIds,
    type RunState,
    type RunStep,
} from "../../utils/programRun";
import {
    describeAutoBlock,
    formatDuration,
    formatTarget,
    getAutoSchemeProblems,
    isAutoScheme,
} from "../../utils/programAuto";
import { formatWeight } from "../../utils/performedExercises";
import { renderRichText } from "../../utils/richText";
import { playSignal, unlockSignal } from "../../utils/runSignal";

/** Прибавка к отдыху по кнопке «+30 секунд». */
const EXTRA_REST_SECONDS = 30;

function readSavedRun(ids: RunIds, stepsCount: number): RunState | null {
    try {
        const raw = window.localStorage.getItem(runStorageKey(ids));

        return raw ? parseRunState(JSON.parse(raw), ids, stepsCount) : null;
    } catch {
        return null;
    }
}

function writeSavedRun(state: RunState): void {
    try {
        window.localStorage.setItem(runStorageKey(state), JSON.stringify(state));
    } catch {
        // Хранилище недоступно или переполнено — прохождение всё равно
        // работает, просто не восстановится после закрытия вкладки.
    }
}

function clearSavedRun(ids: RunIds): void {
    try {
        window.localStorage.removeItem(runStorageKey(ids));
    } catch {
        // См. writeSavedRun.
    }
}

/** Текущее время, обновляемое несколько раз в секунду, пока active. */
function useNow(active: boolean): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!active) {
            return;
        }

        setNow(Date.now());

        const timer = window.setInterval(() => setNow(Date.now()), 250);

        return () => window.clearInterval(timer);
    }, [active]);

    return now;
}

/** Где мы в схеме: комплекс · сет · подход. */
function describePosition(step: RunStep): string {
    const parts: string[] = [];

    if (step.blocksCount > 1) {
        parts.push(step.blockTitle.trim() || `Комплекс ${step.blockIndex + 1}`);
    }

    if (step.showSet) {
        parts.push(`сет ${step.setNumber} из ${step.setsCount}`);
    }

    if (step.rounds > 1) {
        parts.push(
            `${step.roundsAreCircles ? "круг" : "подход"} ${step.round} из ${step.rounds}`
        );
    }

    return parts.join(" · ");
}

// =====================================================================
// Результат шага: сколько повторений или секунд человек сделал
// =====================================================================

function Stepper({
    value,
    ariaLabel,
    onChange,
}: {
    value: number;
    ariaLabel: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="program-scheme-run__stepper">
            <button
                type="button"
                className="program-scheme-run__stepper-button"
                aria-label="Меньше"
                onClick={() => onChange(Math.max(0, value - 1))}
            >
                −
            </button>

            <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_RESULT}
                className="program-scheme-run__stepper-input"
                aria-label={ariaLabel}
                value={value}
                onChange={(event) => onChange(Number(event.target.value) || 0)}
            />

            <button
                type="button"
                className="program-scheme-run__stepper-button"
                aria-label="Больше"
                onClick={() => onChange(Math.min(MAX_RESULT, value + 1))}
            >
                +
            </button>
        </div>
    );
}

type TogetherRows = { groupKey: string; name: string; value: number }[];

/**
 * Результат подхода: сколько повторений или секунд. У упражнения на
 * время, где автор включил «Считать повторения», — ещё и сколько
 * повторений сделано за это время.
 */
function ResultField({
    step,
    value,
    repsValue,
    label,
    onChange,
    onRepsChange,
    togetherRows,
    onTogetherRepsChange,
}: {
    step: RunStep;
    value: number;
    repsValue: number;
    label: string;
    onChange: (value: number) => void;
    onRepsChange: (value: number) => void;

    /** EMOM «все вместе»: повторения каждого упражнения интервала. */
    togetherRows?: { groupKey: string; name: string; value: number }[];
    onTogetherRepsChange?: (groupKey: string, value: number) => void;
}) {
    // У AMRAP и EMOM время известно (таймер) — спрашиваем только
    // повторения.
    const isAmrap = isRepsOnlyTimedKind(step.targetKind);

    return (
        <div className="program-scheme-run__result">
            <p className="program-scheme-run__result-label">{label}</p>

            {
                // У AMRAP время известно (таймер) — спрашиваем только
                // повторения.
                !isAmrap && (
                    <>
                        <Stepper
                            value={value}
                            ariaLabel={
                                isTimedKind(step.targetKind)
                                    ? "Сколько секунд выполнялось"
                                    : "Сколько повторений сделано"
                            }
                            onChange={onChange}
                        />

                        <p className="program-scheme-run__result-unit">
                            {resultUnit(step.targetKind, value)}
                        </p>
                    </>
                )
            }

            {
                togetherRows && onTogetherRepsChange && (
                    <>
                        {
                            togetherRows.map((row) => (
                                <div
                                    key={row.groupKey}
                                    className="program-scheme-run__emom-row"
                                >
                                    <p className="program-scheme-run__emom-name">
                                        {row.name}
                                    </p>

                                    <Stepper
                                        value={row.value}
                                        ariaLabel={`Сколько повторений: ${row.name}`}
                                        onChange={(next) =>
                                            onTogetherRepsChange(
                                                row.groupKey,
                                                next
                                            )
                                        }
                                    />

                                    <p className="program-scheme-run__result-unit">
                                        {resultUnit("reps", row.value)}
                                    </p>
                                </div>
                            ))
                        }
                    </>
                )
            }

            {
                step.trackReps && !togetherRows && (
                    <>
                        {
                            !isAmrap && (
                                <p className="program-scheme-run__result-label">
                                    Сколько повторений сделали за это время
                                </p>
                            )
                        }

                        <Stepper
                            value={repsValue}
                            ariaLabel="Сколько повторений сделано за это время"
                            onChange={onRepsChange}
                        />

                        <p className="program-scheme-run__result-unit">
                            {resultUnit("reps", repsValue)}
                        </p>
                    </>
                )
            }
        </div>
    );
}

// =====================================================================
// Экран перед стартом
// =====================================================================

function IntroScreen({
    scheme,
    programTitle,
    steps,
    saved,
    onStart,
    onResume,
}: {
    scheme: ProgramScheme;
    programTitle: string;
    steps: RunStep[];
    saved: RunState | null;
    onStart: () => void;
    onResume: () => void;
}) {
    const restMinutes = Math.round(totalRestSeconds(steps) / 60);

    return (
        <div className="program-scheme-run__panel">
            <p className="program-scheme-run__eyebrow">{programTitle}</p>
            <h1 className="program-scheme-run__title">
                {scheme.name || "Схема"}
            </h1>

            <p className="program-scheme-run__lead">
                Приложение будет вести вас по схеме: покажет упражнение,
                включит таймер отдыха, а после каждого подхода вы отметите,
                сколько сделали. Экран не будет гаснуть, пока вы тренируетесь.
            </p>

            <ul className="program-scheme-run__facts">
                <li>Всего подходов: {steps.length}</li>
                {
                    restMinutes > 0 && (
                        <li>Отдых суммарно: около {restMinutes} мин</li>
                    )
                }
            </ul>

            <div className="program-scheme-run__overview">
                {
                    scheme.blocks
                        .filter((block) => block.items.length > 0)
                        .map((block, index) => (
                            <div key={block.id}>
                                <p className="program-scheme-run__overview-title">
                                    {block.title.trim() || `Комплекс ${index + 1}`}
                                </p>

                                {
                                    describeAutoBlock(block).map((line) => (
                                        <p
                                            key={line}
                                            className="program-scheme-run__overview-line"
                                        >
                                            {line}
                                        </p>
                                    ))
                                }
                            </div>
                        ))
                }
            </div>

            <div className="program-scheme-run__actions">
                {
                    saved && (
                        <Button
                            className="program-scheme-run__big-button"
                            onClick={onResume}
                        >
                            {
                                saved.phase === "finished"
                                    ? "Открыть итог прошлого прохождения"
                                    : `Продолжить — шаг ${saved.stepIndex + 1} из ${steps.length}`
                            }
                        </Button>
                    )
                }

                <Button
                    className="program-scheme-run__big-button"
                    variant={saved ? "secondary" : "primary"}
                    onClick={onStart}
                >
                    {saved ? "Начать заново" : "Начать"}
                </Button>
            </div>
        </div>
    );
}

// =====================================================================
// Рабочий экран: упражнение, цель, секундомер
// =====================================================================

/** Сколько секунд показывается фото, если упражнений несколько. */
const PHOTO_SECONDS = 5;

/**
 * Видео или фото упражнения. Если упражнений несколько (EMOM «все
 * вместе»), они сменяют друг друга по кругу: видео — когда доиграло,
 * фото — через PHOTO_SECONDS секунд. У одного упражнения видео
 * проигрывается по кругу, как и раньше.
 */
function ExerciseMedia({ exercises }: { exercises: Exercise[] }) {
    const withMedia = exercises.filter(
        (exercise) => exercise.videoUrl || exercise.photoUrl
    );
    const several = withMedia.length > 1;

    const [index, setIndex] = useState(0);

    // Номер, на котором видео не загрузилось: ведём себя как с фото —
    // показываем паузу и идём дальше.
    const [failedIndex, setFailedIndex] = useState<number | null>(null);

    const current = withMedia.length > 0
        ? withMedia[index % withMedia.length]
        : undefined;

    const showsPhoto =
        current !== undefined &&
        (!current.videoUrl || failedIndex === index);

    useEffect(() => {
        if (!several || !showsPhoto) {
            return;
        }

        const timer = window.setTimeout(
            () => setIndex((value) => value + 1),
            PHOTO_SECONDS * 1000
        );

        return () => window.clearTimeout(timer);
    }, [several, showsPhoto, index]);

    if (!current) {
        return null;
    }

    return (
        <>
            {
                current.videoUrl && failedIndex !== index ? (
                    <video
                        // key — при смене упражнения плеер создаётся заново.
                        key={`${index}:${current.videoUrl}`}
                        className="program-scheme-run__media"
                        src={`${current.videoUrl}#t=0.1`}
                        poster={current.photoUrl}
                        autoPlay
                        muted
                        loop={!several}
                        playsInline
                        preload="auto"
                        aria-label={`Видео: ${current.name}`}
                        onEnded={
                            several
                                ? () => setIndex((value) => value + 1)
                                : undefined
                        }
                        onError={
                            several ? () => setFailedIndex(index) : undefined
                        }
                    />
                ) : (
                    current.photoUrl && (
                        <img
                            className="program-scheme-run__media"
                            src={current.photoUrl}
                            alt={current.name}
                        />
                    )
                )
            }

            {
                several && (
                    <p className="program-scheme-run__media-caption">
                        {current.name}
                    </p>
                )
            }
        </>
    );
}

function WorkScreen({
    step,
    nextStep,
    name,
    exercises,
    state,
    now,
    nameOf,
    onStartTimer,
    onEmomReps,
    onDone,
    emomEntries,
}: {
    step: RunStep;
    nextStep: RunStep | undefined;
    name: string;
    /** Упражнения шага: у EMOM «все вместе» их несколько. */
    exercises: Exercise[];
    state: RunState;
    now: number;
    nameOf: (item: ProgramBlockItem) => string;
    onStartTimer: () => void;
    onEmomReps: (groupKey: string, value: number) => void;
    onDone: () => void;

    /** Упражнения EMOM-сета для окошек повторений. */
    emomEntries: EmomPanelEntry[];
}) {
    const position = describePosition(step);
    const isTimed = isTimedKind(step.targetKind);
    const isAmrap = step.targetKind === "amrap";
    const isEmom = step.targetKind === "emom";

    // EMOM: следующий подход (или следующее упражнение сета) начнётся
    // сам.
    const continuesToNext = emomContinues(step, nextStep);
    const timerStarted = state.workStartedAt !== undefined;
    const elapsed = timerStarted
        ? Math.max(0, Math.floor((now - state.workStartedAt!) / 1000))
        : 0;
    const remaining = step.targetValue - elapsed;

    return (
        <div className="program-scheme-run__panel">
            {
                position && (
                    <p className="program-scheme-run__eyebrow">{position}</p>
                )
            }

            <h1 className="program-scheme-run__exercise">{name}</h1>

            <ExerciseMedia key={step.index} exercises={exercises} />

            {
                isTimed && timerStarted ? (
                    <div className="program-scheme-run__target">
                        <p
                            className={
                                remaining > 0
                                    ? "program-scheme-run__clock"
                                    : "program-scheme-run__clock program-scheme-run__clock--over"
                            }
                            aria-live="off"
                        >
                            {
                                remaining > 0
                                    ? formatClock(remaining)
                                    : isAmrap || isEmom
                                      ? formatClock(0)
                                      : `+${formatClock(-remaining)}`
                            }
                        </p>

                        <p className="program-scheme-run__target-note">
                            {
                                isEmom
                                    ? continuesToNext && nextStep
                                        ? nextStep.groupKey === step.groupKey
                                            ? "Когда таймер дойдёт до нуля, следующий подход начнётся сам"
                                            : `Когда таймер дойдёт до нуля, начнётся: ${describeStepName(nextStep, nameOf)}`
                                        : "Это последний интервал: на нуле таймера он закончится"
                                    : isAmrap
                                      ? remaining > 0
                                          ? "Сделайте как можно больше повторений"
                                          : "Время вышло — нажмите «Готово»"
                                      : remaining > 0
                                      ? `Цель: ${formatTarget(step.item.target)}`
                                      : "Цель выполнена — можно продолжать дольше"
                            }
                        </p>
                    </div>
                ) : (
                    <div className="program-scheme-run__target">
                        <p className="program-scheme-run__target-value">
                            {[
                                formatTarget(step.item.target),
                                formatWeight(step.item.weightKg),
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>

                        <p className="program-scheme-run__target-note">
                            {
                                step.targetKind === "max"
                                    ? "Сделайте свой максимум"
                                    : isEmom
                                      ? "Каждый подход — отсчёт с этого времени, таймер перезапускается сам"
                                      : isAmrap
                                        ? "Сделайте как можно больше повторений за это время"
                                        : "Ориентир — сделайте столько, сколько получится"
                            }
                        </p>
                    </div>
                )
            }

            {
                // EMOM: окошки с повторениями — и до старта, и во время
                // выполнения; по одному на каждое упражнение сета. На
                // нуле таймера значение упражнения запоминается как
                // результат его подхода.
                isEmom && (
                    <div className="program-scheme-run__result">
                        <p className="program-scheme-run__result-label">
                            {
                                timerStarted
                                    ? "Повторения — запомнятся на нуле таймера"
                                    : step.together
                                      ? "Сколько повторений каждого упражнения вы планируете сделать за интервал"
                                      : emomEntries.length > 1
                                      ? "Сколько повторений вы планируете делать в каждом упражнении"
                                      : "Сколько повторений вы планируете делать в каждом подходе"
                            }
                        </p>

                        {
                            emomEntries.map((emomEntry) => {
                                const reps = emomRepsFor(
                                    state,
                                    emomEntry.groupKey,
                                    emomEntry.reps
                                );

                                // «Все вместе» — делаются сразу все.
                                const current =
                                    !step.together &&
                                    emomEntry.groupKey === step.groupKey;
                                const exerciseName = nameOf(emomEntry.item);

                                return (
                                    <div
                                        key={emomEntry.groupKey}
                                        className={
                                            current
                                                ? "program-scheme-run__emom-row program-scheme-run__emom-row--current"
                                                : step.together
                                                  ? "program-scheme-run__emom-row"
                                                  : "program-scheme-run__emom-row program-scheme-run__emom-row--dim"
                                        }
                                        aria-current={current ? "true" : undefined}
                                    >
                                        {
                                            emomEntries.length > 1 && (
                                                <p className="program-scheme-run__emom-name">
                                                    {exerciseName}
                                                    {
                                                        current && timerStarted
                                                            ? " — сейчас"
                                                            : ""
                                                    }
                                                </p>
                                            )
                                        }

                                        <Stepper
                                            value={reps}
                                            ariaLabel={`Сколько повторений: ${exerciseName}`}
                                            onChange={(value) =>
                                                onEmomReps(
                                                    emomEntry.groupKey,
                                                    value
                                                )
                                            }
                                        />

                                        <p className="program-scheme-run__result-unit">
                                            {resultUnit("reps", reps)}
                                        </p>
                                    </div>
                                );
                            })
                        }
                    </div>
                )
            }

            {
                step.item.load && (
                    <p className="program-scheme-run__note">{step.item.load}</p>
                )
            }

            {
                isTimed && !timerStarted ? (
                    <Button
                        className="program-scheme-run__big-button"
                        onClick={onStartTimer}
                    >
                        Старт
                    </Button>
                ) : isEmom ? (
                    // Подходы EMOM заканчиваются сами; кнопка — на случай,
                    // если нужно остановиться раньше.
                    <Button variant="secondary" onClick={onDone}>
                        Закончить досрочно
                    </Button>
                ) : (
                    <Button
                        className="program-scheme-run__big-button"
                        onClick={onDone}
                    >
                        Готово
                    </Button>
                )
            }

            <p className="program-scheme-run__next">
                {
                    nextStep
                        ? `Дальше: ${describeStepName(nextStep, nameOf)}, ${formatTarget(nextStep.item.target)}`
                        : "Это последний подход"
                }
            </p>
        </div>
    );
}

// =====================================================================
// Отдых: таймер и отметка результата только что сделанного подхода
// =====================================================================

function RestScreen({
    step,
    nextStep,
    name,
    state,
    now,
    nameOf,
    onResult,
    onReps,
    togetherRows,
    onTogetherReps,
    onExtend,
    onNext,
}: {
    step: RunStep;
    nextStep: RunStep;
    name: string;
    state: RunState;
    now: number;
    nameOf: (item: ProgramBlockItem) => string;
    onResult: (value: number) => void;
    onReps: (value: number) => void;
    togetherRows?: TogetherRows;
    onTogetherReps: (groupKey: string, value: number) => void;
    onExtend: () => void;
    onNext: () => void;
}) {
    const hasTimer = state.restEndsAt !== undefined;
    const remaining = restRemainingSeconds(state, now);
    const isOver = hasTimer && remaining <= 0;
    const done = state.results[step.index] ?? step.targetValue;

    const resultLabel = [name, describePosition(step)]
        .filter(Boolean)
        .join(" — ");

    return (
        <div className="program-scheme-run__panel">
            <p className="program-scheme-run__eyebrow">
                {hasTimer ? "Отдых" : "Отметьте результат"}
            </p>

            {
                hasTimer && (
                    <>
                        <p
                            className={
                                isOver
                                    ? "program-scheme-run__clock program-scheme-run__clock--over"
                                    : "program-scheme-run__clock"
                            }
                            aria-live="off"
                        >
                            {isOver ? "0:00" : formatClock(remaining)}
                        </p>

                        <p className="program-scheme-run__target-note">
                            {
                                isOver
                                    ? "Отдых закончен — пора продолжать"
                                    : `Отдых по плану: ${formatDuration(step.restAfter ?? 0)}`
                            }
                        </p>
                    </>
                )
            }

            <ResultField
                step={step}
                value={done}
                repsValue={state.repsResults[step.index] ?? step.targetReps}
                label={`Сколько вы сделали: ${resultLabel}`}
                onChange={onResult}
                onRepsChange={onReps}
                togetherRows={togetherRows}
                onTogetherRepsChange={onTogetherReps}
            />

            <div className="program-scheme-run__next-card">
                <p className="program-scheme-run__next-label">Дальше</p>
                <p className="program-scheme-run__next-name">
                    {describeStepName(nextStep, nameOf)}
                </p>
                <p className="program-scheme-run__next-meta">
                    {
                        [describePosition(nextStep), formatTarget(nextStep.item.target)]
                            .filter(Boolean)
                            .join(" · ")
                    }
                </p>
            </div>

            <div className="program-scheme-run__actions">
                <Button
                    className="program-scheme-run__big-button"
                    onClick={onNext}
                >
                    {
                        !hasTimer || isOver
                            ? "Начать следующий подход"
                            : "Пропустить отдых"
                    }
                </Button>

                {
                    hasTimer && !isOver && (
                        <Button
                            className="program-scheme-run__big-button"
                            variant="secondary"
                            onClick={onExtend}
                        >
                            +{EXTRA_REST_SECONDS} секунд
                        </Button>
                    )
                }
            </div>
        </div>
    );
}

// =====================================================================
// Конец: результат последнего подхода и итог
// =====================================================================

function FinishScreen({
    steps,
    state,
    name,
    description,
    backTo,
    onResult,
    onReps,
    togetherRows,
    onTogetherReps,
    onCreateEntry,
    onRestart,
    onClose,
    extra,
    createEntryHint,
}: {
    steps: RunStep[];
    state: RunState;
    name: string;

    /** Блок под итогом тренировки (результат комплекса). */
    extra?: React.ReactNode;

    /** Пояснение под кнопкой «Сделать запись в дневнике». */
    createEntryHint?: string;
    togetherRows?: TogetherRows;
    onTogetherReps: (groupKey: string, value: number) => void;

    /** Текст итога — он же попадёт в запись дневника. */
    description: string;
    backTo: string;
    onResult: (value: number) => void;
    onReps: (value: number) => void;
    onCreateEntry: () => void;
    onRestart: () => void;
    onClose: () => void;
}) {
    const last = steps[steps.length - 1];

    return (
        <div className="program-scheme-run__panel">
            <p className="program-scheme-run__eyebrow">Схема выполнена</p>
            <h1 className="program-scheme-run__title">Отличная работа!</h1>

            <ResultField
                step={last}
                value={state.results[last.index] ?? last.targetValue}
                repsValue={state.repsResults[last.index] ?? last.targetReps}
                label={`Последний подход — сколько вы сделали: ${name}`}
                onChange={onResult}
                onRepsChange={onReps}
                togetherRows={togetherRows}
                onTogetherRepsChange={onTogetherReps}
            />

            <h2 className="program-scheme-run__subtitle">Итог тренировки</h2>

            <div className="program-scheme-run__description">
                {renderRichText(description)}
            </div>

            {extra}

            <div className="program-scheme-run__actions">
                <Button
                    className="program-scheme-run__big-button"
                    onClick={onCreateEntry}
                >
                    Сделать запись в дневнике
                </Button>

                {
                    createEntryHint && (
                        <p className="program-scheme-run__hint">
                            {createEntryHint}
                        </p>
                    )
                }

                <Link to={backTo} onClick={onClose}>
                    <Button
                        className="program-scheme-run__big-button"
                        variant="secondary"
                    >
                        Вернуться к схеме
                    </Button>
                </Link>

                <Button
                    className="program-scheme-run__big-button"
                    variant="secondary"
                    onClick={onRestart}
                >
                    Пройти заново
                </Button>
            </div>
        </div>
    );
}

// =====================================================================
// Само прохождение (монтируется, когда схема загружена и годится)
// =====================================================================

/**
 * Прохождение схемы. Используется и для схем программ, и для комплексов
 * каталога (pages/ComplexRun): у комплекса programTitle — его название,
 * isComplex включает «комплексные» тексты, а запись дневника не
 * привязывается к программе.
 */
export function RunScreen({
    ids,
    programTitle,
    sectionId,
    sectionName,
    scheme,
    steps,
    backTo,
    complexDef,
}: {
    ids: RunIds;
    programTitle: string;

    /** Id раздела программы, в котором лежит схема (для записи дневника). */
    sectionId?: string;

    sectionName: string | undefined;
    scheme: ProgramScheme;
    steps: RunStep[];
    backTo: string;

    /** Комплекс каталога, если проходится он, а не схема программы. */
    complexDef?: Complex;
}) {
    const isComplex = complexDef !== undefined;

    // Результат комплекса: показатели, которые помощник не считает
    // (человек вводит их на экране завершения), и что в них не так.
    const [manualResult, setManualResult] = useState<ManualResultFields>({});
    const [resultError, setResultError] = useState<string | null>(null);

    const navigate = useNavigate();
    const { exercises } = useExercises();

    // Незавершённое прохождение этой схемы: предлагаем продолжить.
    const [saved, setSaved] = useState<RunState | null>(() =>
        readSavedRun(ids, steps.length)
    );
    const [state, setState] = useState<RunState | null>(null);

    // Для каких шагов и фаз сигнал уже прозвучал (чтобы не повторять и
    // не сигналить при возвращении на уже закончившийся отдых).
    const signalledRef = useRef<string>("");

    const now = useNow(state !== null && state.phase !== "finished");

    useWakeLock(state !== null);

    // Прогресс сохраняется при каждом изменении.
    useEffect(() => {
        if (state) {
            writeSavedRun(state);
        }
    }, [state]);

    const exerciseById = useMemo(
        () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
        [exercises]
    );

    function exerciseOf(item: ProgramBlockItem): Exercise | undefined {
        return item.kind === "exercise"
            ? exerciseById.get(item.exerciseId)
            : undefined;
    }

    // EMOM «все вместе»: повторения каждого упражнения интервала —
    // для правки на экране отдыха и в конце.
    function togetherRowsOf(target: RunStep): TogetherRows | undefined {
        return target.together?.map((entry) => ({
            groupKey: entry.groupKey,
            name: nameOf(entry.item),
            value:
                state?.togetherReps?.[target.index]?.[entry.groupKey] ??
                entry.reps,
        }));
    }

    function nameOf(item: ProgramBlockItem): string {
        return item.kind === "exercise"
            ? exerciseById.get(item.exerciseId)?.name ?? "Упражнение"
            : item.text;
    }

    const step = state ? steps[state.stepIndex] : undefined;

    // Сигнал: закончился отдых или выполнено время упражнения на время.
    const restOver =
        state?.phase === "rest" &&
        state.restEndsAt !== undefined &&
        now >= state.restEndsAt;

    const timedOver =
        state?.phase === "work" &&
        step !== undefined &&
        isTimedKind(step.targetKind) &&
        step.targetKind !== "emom" &&
        state.workStartedAt !== undefined &&
        (now - state.workStartedAt) / 1000 >= step.targetValue;

    useEffect(() => {
        if (!state || (!restOver && !timedOver)) {
            return;
        }

        const key = `${state.stepIndex}:${state.phase}`;

        if (signalledRef.current !== key) {
            signalledRef.current = key;
            playSignal();
        }
    }, [state, restOver, timedOver]);

    // EMOM: на нуле таймера подход записывается, и следующий начинается
    // сам (или упражнение заканчивается). Сигнал — на каждом нуле.
    useEffect(() => {
        if (!state || state.phase !== "work") {
            return;
        }

        const advanced = advanceEmom(state, steps, now);

        if (advanced !== state) {
            playSignal();
            setState(advanced);
        }
    }, [now, state, steps]);

    function update(change: (current: RunState) => RunState) {
        setState((current) => (current ? change(current) : current));
    }

    function handleStart() {
        unlockSignal();
        clearSavedRun(ids);
        setSaved(null);
        signalledRef.current = "";
        setManualResult({});
        setResultError(null);
        setState(createRun(ids, Date.now()));
    }

    function handleResume() {
        if (!saved) {
            return;
        }

        unlockSignal();

        // Если отдых успел закончиться, пока вкладка была закрыта, —
        // сигнал для него уже не нужен.
        signalledRef.current = `${saved.stepIndex}:${saved.phase}`;

        // EMOM нельзя «догонять»: пока вкладка была закрыта, интервалы
        // не выполнялись — подход начнётся заново по «Старту».
        const resumed =
            saved.phase === "work" &&
            steps[saved.stepIndex]?.targetKind === "emom"
                ? { ...saved, workStartedAt: undefined }
                : saved;

        setState(resumed);
        setSaved(null);
    }

    function handleAbort() {
        if (
            !window.confirm(
                "Прервать прохождение? Отмеченные результаты будут потеряны."
            )
        ) {
            return;
        }

        clearSavedRun(ids);
        navigate(backTo);
    }

    /**
     * Переход к созданию записи в дневнике с готовым описанием и
     * выбранными программой, разделом и схемой. Сохранённое прохождение
     * не стираем: если человек откажется заменять свой черновик записи,
     * итог можно будет открыть снова.
     */
    function handleCreateEntry() {
        if (!state) {
            return;
        }

        const minutes = Math.max(
            1,
            Math.round((Date.now() - state.startedAt) / 60000)
        );

        const sectionLabel = sectionName?.trim();
        const schemeLabel = scheme.name.trim();

        const workoutPrefill: WorkoutEntryPrefill = {
            title: isComplex
                ? programTitle
                : [sectionLabel, schemeLabel].filter(Boolean).join(" — ") ||
                  programTitle,
            description: buildRunDescription({
                programTitle,
                isComplex,
                sectionName,
                schemeName: scheme.name,
                steps,
                results: state.results,
                repsResults: state.repsResults,
                togetherReps: state.togetherReps,
                nameOf,
                minutes,
            }),
            // Комплекс каталога — не программа: к ней запись не привязываем.
            ...(isComplex
                ? {}
                : {
                      programId: ids.programId,
                      programSection: sectionLabel ?? "",
                      programScheme: schemeLabel,
                      programSectionId: sectionId ?? "",
                      programSchemeId: ids.schemeId,
                  }),
        };

        // Результат комплекса ждёт новой записи: форма записи после
        // сохранения привяжет к ней выполнение (AddWorkoutEntry).
        let complexCompletion: object | undefined;

        if (complexDef) {
            const problem = validateManualResult(
                complexDef.resultMetrics,
                manualResult
            );

            if (problem) {
                setResultError(problem);
                return;
            }

            // Выполнение привязывается к записи всегда — даже если вносить
            // в него нечего: иначе запись не подтверждала бы комплекс.
            complexCompletion = {
                complexId: complexDef.id,
                complexName: complexDef.name,
                ...buildRunResultFields(
                    complexDef.resultMetrics,
                    computeRunTotals(steps, state, Date.now())
                ),
                ...pickManualFields(complexDef.resultMetrics, manualResult),
            };
        }

        navigate("/diary/create/workout", {
            state: {
                workoutPrefill,
                ...(complexCompletion ? { complexCompletion } : {}),
            },
        });
    }

    function handleRestart() {
        clearSavedRun(ids);
        signalledRef.current = "";
        setManualResult({});
        setResultError(null);
        setState(createRun(ids, Date.now()));
    }

    if (!state || !step) {
        return (
            <IntroScreen
                scheme={scheme}
                programTitle={isComplex ? "Комплекс" : programTitle}
                steps={steps}
                saved={saved}
                onStart={handleStart}
                onResume={handleResume}
            />
        );
    }

    const nextStep = steps[state.stepIndex + 1];
    const doneSteps = state.stepIndex + (state.phase === "work" ? 0 : 1);
    const progress = Math.round((doneSteps / steps.length) * 100);

    // Текст итога: показывается на экране завершения, попадает в запись
    // дневника и (по галочке) дописывается в существующую запись.
    const finishDescription =
        state.phase === "finished"
            ? buildRunDescription({
                  programTitle,
                  isComplex,
                  sectionName,
                  schemeName: scheme.name,
                  steps,
                  results: state.results,
                  repsResults: state.repsResults,
                  togetherReps: state.togetherReps,
                  nameOf,
                  minutes: Math.max(
                      1,
                      Math.round((now - state.startedAt) / 60000)
                  ),
              })
            : "";

    return (
        <div className="program-scheme-run__session">
            <div className="program-scheme-run__topbar">
                <span>
                    {
                        state.phase === "finished"
                            ? `Выполнено подходов: ${steps.length}`
                            : `Подход ${state.stepIndex + 1} из ${steps.length}`
                    }
                </span>

                {
                    state.phase !== "finished" && (
                        <button
                            type="button"
                            className="program-scheme-run__abort"
                            onClick={handleAbort}
                        >
                            Прервать
                        </button>
                    )
                }
            </div>

            <div
                className="program-scheme-run__progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Прогресс прохождения схемы"
            >
                <div
                    className="program-scheme-run__progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {
                state.phase === "work" && (
                    <WorkScreen
                        step={step}
                        nextStep={nextStep}
                        name={describeStepName(step, nameOf)}
                        exercises={(step.together
                            ? step.together.map((entry) =>
                                  exerciseOf(entry.item)
                              )
                            : [exerciseOf(step.item)]
                        ).filter(
                            (exercise): exercise is Exercise =>
                                exercise !== undefined
                        )}
                        state={state}
                        now={now}
                        nameOf={nameOf}
                        onStartTimer={() => {
                            unlockSignal();
                            update((current) =>
                                startTimedWork(current, Date.now())
                            );
                        }}
                        emomEntries={emomPanel(steps, step)}
                        onEmomReps={(groupKey, value) =>
                            update((current) =>
                                setEmomReps(current, groupKey, value)
                            )
                        }
                        onDone={() => {
                            unlockSignal();
                            update((current) =>
                                completeWork(current, steps, Date.now())
                            );
                        }}
                    />
                )
            }

            {
                state.phase === "rest" && nextStep && (
                    <RestScreen
                        step={step}
                        nextStep={nextStep}
                        name={describeStepName(step, nameOf)}
                        state={state}
                        now={now}
                        nameOf={nameOf}
                        onResult={(value) =>
                            update((current) =>
                                setStepResult(current, step.index, value)
                            )
                        }
                        onReps={(value) =>
                            update((current) =>
                                setStepReps(current, step.index, value)
                            )
                        }
                        togetherRows={togetherRowsOf(step)}
                        onTogetherReps={(groupKey, value) =>
                            update((current) =>
                                setTogetherReps(
                                    current,
                                    step.index,
                                    groupKey,
                                    value
                                )
                            )
                        }
                        onExtend={() =>
                            update((current) =>
                                extendRest(current, EXTRA_REST_SECONDS, Date.now())
                            )
                        }
                        onNext={() =>
                            update((current) => goToNextStep(current, steps))
                        }
                    />
                )
            }

            {
                state.phase === "finished" && (
                    <FinishScreen
                        steps={steps}
                        state={state}
                        name={describeStepName(step, nameOf)}
                        description={finishDescription}
                        backTo={backTo}
                        extra={
                            complexDef ? (
                                <ComplexRunResult
                                    manual={manualResult}
                                    onManualChange={setManualResult}
                                    error={resultError}
                                    onErrorChange={setResultError}
                                    complexDef={complexDef}
                                    fields={buildRunResultFields(
                                        complexDef.resultMetrics,
                                        computeRunTotals(steps, state, now)
                                    )}
                                    description={finishDescription}
                                />
                            ) : undefined
                        }
                        createEntryHint={
                            complexDef
                                ? "Результат комплекса добавится к новой записи автоматически."
                                : undefined
                        }
                        onResult={(value) =>
                            update((current) =>
                                setStepResult(current, step.index, value)
                            )
                        }
                        onReps={(value) =>
                            update((current) =>
                                setStepReps(current, step.index, value)
                            )
                        }
                        togetherRows={togetherRowsOf(step)}
                        onTogetherReps={(groupKey, value) =>
                            update((current) =>
                                setTogetherReps(
                                    current,
                                    step.index,
                                    groupKey,
                                    value
                                )
                            )
                        }
                        onCreateEntry={handleCreateEntry}
                        onRestart={handleRestart}
                        onClose={() => clearSavedRun(ids)}
                    />
                )
            }
        </div>
    );
}

/**
 * Прохождение автоматической схемы программы с таймерами:
 * - /programs/:id/schemes/:schemeId/run — схема текущей версии;
 * - /programs/:id/versions/:versionId/schemes/:schemeId/run — схема
 *   конкретной версии.
 * Страница только для вошедших пользователей. Ход прохождения хранится
 * в браузере: можно закрыть вкладку и вернуться.
 */
export default function ProgramSchemeRun() {
    const { id, versionId, schemeId } = useParams();
    const data = useProgramScheme(id, versionId, schemeId);

    usePageMeta(
        data.status === "ready"
            ? `Прохождение: ${data.scheme.name || "схема"} — ${data.program.title}`
            : undefined
    );

    const steps = useMemo(
        () =>
            data.status === "ready" && isAutoScheme(data.scheme)
                ? buildRunSteps(data.scheme)
                : [],
        [data]
    );

    if (data.status === "loading") {
        return <p className="program-scheme-run__message">Загрузка…</p>;
    }

    const schemePath =
        versionId !== undefined
            ? `/programs/${id}/versions/${versionId}/schemes/${schemeId}`
            : `/programs/${id}/schemes/${schemeId}`;

    if (data.status === "missing") {
        return (
            <div className="program-scheme-run__message">
                <p>Схема не найдена.</p>
                <Link to={id ? `/programs/${id}` : "/programs"}>
                    ← К программе
                </Link>
            </div>
        );
    }

    const { program, version, section, scheme } = data;

    if (!isAutoScheme(scheme) || getAutoSchemeProblems(scheme).length > 0) {
        return (
            <div className="program-scheme-run__message">
                <p>
                    Эту схему нельзя пройти с таймерами: автор не задал для неё
                    все данные.
                </p>
                <Link to={schemePath}>← К схеме</Link>
            </div>
        );
    }

    return (
        <div className="program-scheme-run">
            <RunScreen
                // Новая схема или версия — новое прохождение с нуля.
                key={`${program.id}/${version.id}/${scheme.id}`}
                ids={{
                    programId: program.id,
                    versionId: version.id,
                    schemeId: scheme.id,
                }}
                programTitle={program.title}
                sectionId={section.id}
                sectionName={section.name}
                scheme={scheme}
                steps={steps}
                backTo={schemePath}
            />
        </div>
    );
}
