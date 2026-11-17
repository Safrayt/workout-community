import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "../../components/ui/Button/Button";

import "../../styles/components/program-scheme-run.css";

import { useExercises } from "../../context/ExerciseContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useProgramScheme } from "../../hooks/useProgramScheme";
import { useWakeLock } from "../../hooks/useWakeLock";
import type { Exercise } from "../../types/exercise";
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
}: {
    step: RunStep;
    value: number;
    repsValue: number;
    label: string;
    onChange: (value: number) => void;
    onRepsChange: (value: number) => void;
}) {
    return (
        <div className="program-scheme-run__result">
            <p className="program-scheme-run__result-label">{label}</p>

            <Stepper
                value={value}
                ariaLabel={
                    step.targetKind === "seconds"
                        ? "Сколько секунд выполнялось"
                        : "Сколько повторений сделано"
                }
                onChange={onChange}
            />

            <p className="program-scheme-run__result-unit">
                {resultUnit(step.targetKind, value)}
            </p>

            {
                step.trackReps && (
                    <>
                        <p className="program-scheme-run__result-label">
                            Сколько повторений сделали за это время
                        </p>

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

function WorkScreen({
    step,
    nextStep,
    name,
    exercise,
    state,
    now,
    nameOf,
    onStartTimer,
    onDone,
}: {
    step: RunStep;
    nextStep: RunStep | undefined;
    name: string;
    exercise: Exercise | undefined;
    state: RunState;
    now: number;
    nameOf: (item: ProgramBlockItem) => string;
    onStartTimer: () => void;
    onDone: () => void;
}) {
    const position = describePosition(step);
    const isTimed = step.targetKind === "seconds";
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

            {
                exercise?.videoUrl ? (
                    <video
                        // key — при смене упражнения плеер создаётся заново.
                        key={exercise.videoUrl}
                        className="program-scheme-run__media"
                        src={`${exercise.videoUrl}#t=0.1`}
                        poster={exercise.photoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        aria-label={`Видео: ${name}`}
                    />
                ) : (
                    exercise?.photoUrl && (
                        <img
                            className="program-scheme-run__media"
                            src={exercise.photoUrl}
                            alt={name}
                        />
                    )
                )
            }

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
                                    : `+${formatClock(-remaining)}`
                            }
                        </p>

                        <p className="program-scheme-run__target-note">
                            {
                                remaining > 0
                                    ? `Цель: ${formatTarget(step.item.target)}`
                                    : "Цель выполнена — можно продолжать дольше"
                            }
                        </p>
                    </div>
                ) : (
                    <div className="program-scheme-run__target">
                        <p className="program-scheme-run__target-value">
                            {formatTarget(step.item.target)}
                        </p>

                        <p className="program-scheme-run__target-note">
                            {
                                step.targetKind === "max"
                                    ? "Сделайте свой максимум"
                                    : "Ориентир — сделайте столько, сколько получится"
                            }
                        </p>
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
                        ? `Дальше: ${nameOf(nextStep.item)}, ${formatTarget(nextStep.item.target)}`
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
            />

            <div className="program-scheme-run__next-card">
                <p className="program-scheme-run__next-label">Дальше</p>
                <p className="program-scheme-run__next-name">
                    {nameOf(nextStep.item)}
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
    onCreateEntry,
    onRestart,
    onClose,
}: {
    steps: RunStep[];
    state: RunState;
    name: string;

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
            />

            <h2 className="program-scheme-run__subtitle">Итог тренировки</h2>

            <div className="program-scheme-run__description">
                {renderRichText(description)}
            </div>

            <div className="program-scheme-run__actions">
                <Button
                    className="program-scheme-run__big-button"
                    onClick={onCreateEntry}
                >
                    Сделать запись в дневнике
                </Button>

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

function RunScreen({
    ids,
    programTitle,
    sectionName,
    scheme,
    steps,
    backTo,
}: {
    ids: RunIds;
    programTitle: string;
    sectionName: string | undefined;
    scheme: ProgramScheme;
    steps: RunStep[];
    backTo: string;
}) {
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
        step?.targetKind === "seconds" &&
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

    function update(change: (current: RunState) => RunState) {
        setState((current) => (current ? change(current) : current));
    }

    function handleStart() {
        unlockSignal();
        clearSavedRun(ids);
        setSaved(null);
        signalledRef.current = "";
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
        setState(saved);
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
            title:
                [sectionLabel, schemeLabel].filter(Boolean).join(" — ") ||
                programTitle,
            description: buildRunDescription({
                programTitle,
                sectionName,
                schemeName: scheme.name,
                steps,
                results: state.results,
                repsResults: state.repsResults,
                nameOf,
                minutes,
            }),
            programId: ids.programId,
            programSection: sectionLabel ?? "",
            programScheme: schemeLabel,
        };

        navigate("/diary/create/workout", { state: { workoutPrefill } });
    }

    function handleRestart() {
        clearSavedRun(ids);
        signalledRef.current = "";
        setState(createRun(ids, Date.now()));
    }

    if (!state || !step) {
        return (
            <IntroScreen
                scheme={scheme}
                programTitle={programTitle}
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
                        name={nameOf(step.item)}
                        exercise={exerciseOf(step.item)}
                        state={state}
                        now={now}
                        nameOf={nameOf}
                        onStartTimer={() => {
                            unlockSignal();
                            update((current) =>
                                startTimedWork(current, Date.now())
                            );
                        }}
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
                        name={nameOf(step.item)}
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
                        name={nameOf(step.item)}
                        description={buildRunDescription({
                            programTitle,
                            sectionName,
                            schemeName: scheme.name,
                            steps,
                            results: state.results,
                            repsResults: state.repsResults,
                            nameOf,
                            minutes: Math.max(
                                1,
                                Math.round((now - state.startedAt) / 60000)
                            ),
                        })}
                        backTo={backTo}
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
                sectionName={section.name}
                scheme={scheme}
                steps={steps}
                backTo={schemePath}
            />
        </div>
    );
}
