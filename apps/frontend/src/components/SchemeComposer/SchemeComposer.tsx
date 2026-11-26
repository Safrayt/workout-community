import { useState } from "react";

import ExerciseSearchInput from "../ExerciseSearchInput/ExerciseSearchInput";
import WeightField from "../WeightField/WeightField";

import "../../styles/components/scheme-composer.css";

import { useExercises } from "../../context/ExerciseContext";

import type {
    ProgramBlock,
    ProgramBlockItem,
    ProgramBlockOrder,
    ProgramItemTarget,
    ProgramTargetKind,
} from "../../types/program";

import {
    MAX_REST_SECONDS,
    MAX_ROUNDS,
    MAX_TARGET_REPS,
    MAX_TARGET_SECONDS,
    describeAutoBlock,
    getBlockSets,
    hasEmomSet,
    hasPerSetRounds,
    hasSupersets,
    isEmomTogetherSet,
    roundsAreCircles,
} from "../../utils/programAuto";
import { formatWeight } from "../../utils/performedExercises";
import {
    SCHEME_PRESETS,
    clampRounds,
    createEmptyBlock,
    createPendingItem,
    describeTargetChip,
    ensureSetRounds,
    getComposerProblems,
    isPendingItem,
    moveInList,
    normalizeBlock,
} from "../../utils/schemeComposer";

type SchemeComposerProps = {
    value: ProgramBlock[];
    onChange: (blocks: ProgramBlock[]) => void;

    /** Список «чего не хватает» под схемой. Редактор программ показывает
     *  свой (по правилам публикации), поэтому там выключен. */
    showProblems?: boolean;
};

// --- Мелкие поля ------------------------------------------------------------

function parseNumber(raw: string, min: number, max: number): number | undefined {
    if (raw.trim() === "") {
        return undefined;
    }

    const parsed = Math.floor(Number(raw));

    if (Number.isNaN(parsed)) {
        return undefined;
    }

    return Math.min(max, Math.max(min, parsed));
}

function NumberField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number | undefined;
    min: number;
    max: number;
    onChange: (value: number | undefined) => void;
}) {
    return (
        <label className="scheme-composer__field">
            <span className="scheme-composer__field-label">{label}</span>

            <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                className="scheme-composer__input"
                value={value ?? ""}
                onChange={(event) =>
                    onChange(parseNumber(event.target.value, min, max))
                }
            />
        </label>
    );
}

/** Отдых «минуты + секунды»; пусто — не задан. */
function DurationField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number | undefined;
    onChange: (seconds: number | undefined) => void;
}) {
    const minutes = value === undefined ? "" : String(Math.floor(value / 60));
    const seconds = value === undefined ? "" : String(value % 60);

    function update(nextMinutes: string, nextSeconds: string) {
        if (nextMinutes.trim() === "" && nextSeconds.trim() === "") {
            onChange(undefined);
            return;
        }

        const total =
            (parseNumber(nextMinutes, 0, 60) ?? 0) * 60 +
            (parseNumber(nextSeconds, 0, 59) ?? 0);

        onChange(Math.min(MAX_REST_SECONDS, total));
    }

    return (
        <div className="scheme-composer__field">
            <span className="scheme-composer__field-label">{label}</span>

            <div className="scheme-composer__duration">
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={60}
                    className="scheme-composer__input"
                    aria-label={`${label}: минуты`}
                    placeholder="0"
                    value={minutes}
                    onChange={(event) => update(event.target.value, seconds)}
                />

                <span>мин</span>

                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    className="scheme-composer__input"
                    aria-label={`${label}: секунды`}
                    placeholder="0"
                    value={seconds}
                    onChange={(event) => update(minutes, event.target.value)}
                />

                <span>сек</span>
            </div>
        </div>
    );
}

function MoveButtons({
    canUp,
    canDown,
    onUp,
    onDown,
    onRemove,
    what,
}: {
    canUp: boolean;
    canDown: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
    what: string;
}) {
    return (
        <div className="scheme-composer__actions">
            <button
                type="button"
                className="scheme-composer__icon-button"
                aria-label={`Переместить выше: ${what}`}
                disabled={!canUp}
                onClick={onUp}
            >
                ↑
            </button>

            <button
                type="button"
                className="scheme-composer__icon-button"
                aria-label={`Переместить ниже: ${what}`}
                disabled={!canDown}
                onClick={onDown}
            >
                ↓
            </button>

            <button
                type="button"
                className="scheme-composer__icon-button scheme-composer__icon-button--danger"
                aria-label={`Убрать: ${what}`}
                onClick={onRemove}
            >
                ✕
            </button>
        </div>
    );
}

// --- Нагрузка упражнения -----------------------------------------------------

const KIND_OPTIONS: { value: ProgramTargetKind; label: string }[] = [
    { value: "reps", label: "Повторения" },
    { value: "seconds", label: "Секунды (время или удержание)" },
    { value: "max", label: "Максимум повторений" },
    { value: "amrap", label: "Максимум за время (AMRAP)" },
    { value: "emom", label: "Каждый интервал заново (EMOM)" },
];

const KIND_HINTS: Record<ProgramTargetKind, string> = {
    reps: "Сколько повторений в подходе.",
    seconds: "Сколько секунд длится подход.",
    max: "Сделать максимум. Число — примерный результат, с него начнётся отметка.",
    amrap: "Таймер на всё время: сделать как можно больше повторений.",
    emom: "Подход на время интервала, потом снова. Число подходов — в настройках комплекса.",
};

function changeKind(
    target: ProgramItemTarget | undefined,
    kind: ProgramTargetKind
): ProgramItemTarget {
    // Повторения за время бывают у секунд, AMRAP и EMOM (у последних
    // двух считаются всегда).
    if (kind === "amrap" || kind === "emom") {
        return { kind, value: target?.value, withReps: true, reps: target?.reps };
    }

    if (kind === "seconds") {
        const keep = target?.kind === "seconds" && target.withReps;

        return {
            kind,
            value: target?.value,
            withReps: keep ? true : false,
            reps: keep ? target?.reps : undefined,
        };
    }

    return { kind, value: target?.value };
}

function TargetPanel({
    item,
    isFirstOfSet,
    perSetRounds,
    canGroup,
    secondsLocked,
    onChange,
}: {
    item: ProgramBlockItem;
    isFirstOfSet: boolean;
    perSetRounds: boolean;
    canGroup: boolean;
    secondsLocked: boolean;
    onChange: (item: ProgramBlockItem) => void;
}) {
    const target = item.target;
    const kind: ProgramTargetKind = target?.kind ?? "reps";
    const timer = kind === "seconds" || kind === "amrap" || kind === "emom";
    const countsReps =
        kind === "amrap" ||
        kind === "emom" ||
        (kind === "seconds" && target?.withReps === true);

    return (
        <div className="scheme-composer__panel">
            <label className="scheme-composer__field">
                <span className="scheme-composer__field-label">
                    Что нужно сделать
                </span>

                <select
                    className="scheme-composer__input"
                    value={kind}
                    onChange={(event) =>
                        onChange({
                            ...item,
                            target: changeKind(
                                target,
                                event.target.value as ProgramTargetKind
                            ),
                        })
                    }
                >
                    {KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>

            <p className="scheme-composer__hint">{KIND_HINTS[kind]}</p>

            <div className="scheme-composer__fields">
                <label className="scheme-composer__field">
                    <span className="scheme-composer__field-label">
                        {timer ? "Секунд" : kind === "max" ? "Примерно повторений" : "Повторений"}
                    </span>

                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={timer ? MAX_TARGET_SECONDS : MAX_TARGET_REPS}
                        className="scheme-composer__input"
                        disabled={secondsLocked}
                        value={target?.value ?? ""}
                        onChange={(event) =>
                            onChange({
                                ...item,
                                target: {
                                    ...target,
                                    kind,
                                    value: parseNumber(
                                        event.target.value,
                                        1,
                                        timer ? MAX_TARGET_SECONDS : MAX_TARGET_REPS
                                    ),
                                },
                            })
                        }
                    />
                </label>

                {countsReps && (
                    <label className="scheme-composer__field">
                        <span className="scheme-composer__field-label">
                            Повторений примерно
                        </span>

                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_TARGET_REPS}
                            className="scheme-composer__input"
                            value={target?.reps ?? ""}
                            onChange={(event) =>
                                onChange({
                                    ...item,
                                    target: {
                                        ...target,
                                        kind,
                                        reps: parseNumber(
                                            event.target.value,
                                            1,
                                            MAX_TARGET_REPS
                                        ),
                                    },
                                })
                            }
                        />
                    </label>
                )}

                {perSetRounds && isFirstOfSet && (
                    <NumberField
                        label="Подходов"
                        min={1}
                        max={MAX_ROUNDS}
                        value={item.rounds}
                        onChange={(rounds) => onChange({ ...item, rounds })}
                    />
                )}
            </div>

            <div className="scheme-composer__field">
                <span className="scheme-composer__field-label">
                    Вес (необязательно)
                </span>

                <WeightField
                    value={item.weightKg}
                    onChange={(weightKg) => onChange({ ...item, weightKg })}
                />
            </div>

            {kind === "seconds" && (
                <label className="scheme-composer__check">
                    <input
                        type="checkbox"
                        checked={target?.withReps === true}
                        onChange={(event) =>
                            onChange({
                                ...item,
                                target: {
                                    kind,
                                    value: target?.value,
                                    withReps: event.target.checked,
                                    reps: event.target.checked
                                        ? target?.reps
                                        : undefined,
                                },
                            })
                        }
                    />
                    Считать повторения за это время
                </label>
            )}

            <label className="scheme-composer__field">
                <span className="scheme-composer__field-label">
                    Примечание к упражнению (необязательно)
                </span>

                <input
                    type="text"
                    className="scheme-composer__input"
                    maxLength={100}
                    placeholder="Например: сумма на обе ноги"
                    value={item.load ?? ""}
                    onChange={(event) =>
                        onChange({ ...item, load: event.target.value || undefined })
                    }
                />
            </label>

            {canGroup && (
                <label className="scheme-composer__check">
                    <input
                        type="checkbox"
                        checked={item.groupWithPrevious === true}
                        onChange={(event) =>
                            onChange({
                                ...item,
                                groupWithPrevious: event.target.checked
                                    ? true
                                    : undefined,
                            })
                        }
                    />
                    В одном сете с предыдущим (суперсет, без отдыха между ними)
                </label>
            )}
        </div>
    );
}

// --- Выбор упражнения для пустой строки --------------------------------------

function PendingPicker({
    onPickExercise,
    onPickCustom,
}: {
    onPickExercise: (exerciseId: string) => void;
    onPickCustom: (text: string) => void;
}) {
    const [custom, setCustom] = useState(false);
    const [text, setText] = useState("");

    if (custom) {
        return (
            <div className="scheme-composer__pending">
                <input
                    type="text"
                    className="scheme-composer__input"
                    placeholder="Название своего упражнения"
                    aria-label="Название своего упражнения"
                    maxLength={120}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                />

                <button
                    type="button"
                    className="scheme-composer__link-button"
                    disabled={text.trim() === ""}
                    onClick={() => onPickCustom(text.trim())}
                >
                    Добавить
                </button>

                <button
                    type="button"
                    className="scheme-composer__link-button"
                    onClick={() => setCustom(false)}
                >
                    Из базы упражнений
                </button>
            </div>
        );
    }

    return (
        <div className="scheme-composer__pending">
            <ExerciseSearchInput
                label="Выберите упражнение"
                onSelect={(exercise) => onPickExercise(exercise.id)}
            />

            <button
                type="button"
                className="scheme-composer__link-button"
                onClick={() => setCustom(true)}
            >
                Своё упражнение
            </button>
        </div>
    );
}

// --- Упражнение ---------------------------------------------------------------

function ItemRow({
    block,
    index,
    openKey,
    keyPrefix,
    onToggle,
    onChangeBlock,
}: {
    block: ProgramBlock;
    index: number;
    openKey: string | null;
    keyPrefix: string;
    onToggle: (key: string) => void;
    onChangeBlock: (block: ProgramBlock) => void;
}) {
    const { getExerciseById } = useExercises();

    const item = block.items[index];
    const key = `${keyPrefix}:item:${index}`;
    const open = openKey === key;

    const sets = getBlockSets(block);
    const set = sets.find((candidate) => candidate.includes(item)) ?? [item];
    const isFirstOfSet = set[0] === item;
    const grouped = !isFirstOfSet;
    const secondsLocked = isEmomTogetherSet(block, set) && !isFirstOfSet;

    function setItem(next: ProgramBlockItem) {
        onChangeBlock(
            normalizeBlock(
                ensureSetRounds({
                    ...block,
                    items: block.items.map((candidate, candidateIndex) =>
                        candidateIndex === index ? next : candidate
                    ),
                })
            )
        );
    }

    function removeItem() {
        const next = block.items.filter((_, itemIndex) => itemIndex !== index);
        const following = next[index];

        // Если убрали начало сета, его следующее упражнение не должно
        // незаметно «прилипнуть» к предыдущему сету.
        if (isFirstOfSet && following?.groupWithPrevious) {
            next[index] = { ...following, groupWithPrevious: undefined };
        }

        onChangeBlock(
            normalizeBlock(ensureSetRounds({ ...block, items: next }))
        );
    }

    function move(direction: -1 | 1) {
        onChangeBlock(
            normalizeBlock(
                ensureSetRounds({
                    ...block,
                    items: moveInList(block.items, index, direction),
                })
            )
        );
    }

    const pending = isPendingItem(item);

    const name =
        item.kind === "exercise"
            ? (getExerciseById(item.exerciseId)?.name ?? "Упражнение")
            : item.text;

    return (
        <li className="scheme-composer__item">
            <div className="scheme-composer__row">
                <div className="scheme-composer__number">
                    {String(index + 1).padStart(2, "0")}
                </div>

                <div className="scheme-composer__body">
                    {pending ? (
                        <PendingPicker
                            onPickExercise={(exerciseId) =>
                                setItem({
                                    kind: "exercise",
                                    exerciseId,
                                    target: item.target,
                                    groupWithPrevious: item.groupWithPrevious,
                                    rounds: item.rounds,
                                    weightKg: item.weightKg,
                                })
                            }
                            onPickCustom={(text) =>
                                setItem({
                                    kind: "text",
                                    text,
                                    target: item.target,
                                    groupWithPrevious: item.groupWithPrevious,
                                    rounds: item.rounds,
                                    weightKg: item.weightKg,
                                })
                            }
                        />
                    ) : (
                        <>
                            <p className="scheme-composer__name">{name}</p>

                            {grouped && (
                                <p className="scheme-composer__sub">
                                    суперсет с предыдущим
                                </p>
                            )}
                        </>
                    )}

                    {!pending && (
                        <button
                            type="button"
                            className="scheme-composer__chip scheme-composer__chip--button"
                            aria-expanded={open}
                            onClick={() => onToggle(key)}
                        >
                            {describeTargetChip(item.target)}
                            {item.weightKg
                                ? ` · ${formatWeight(item.weightKg)}`
                                : ""}{" "}
                            {open ? "▴" : "▾"}
                        </button>
                    )}
                </div>

                <MoveButtons
                    what={pending ? `строка ${index + 1}` : name}
                    canUp={index > 0}
                    canDown={index < block.items.length - 1}
                    onUp={() => move(-1)}
                    onDown={() => move(1)}
                    onRemove={removeItem}
                />
            </div>

            {open && !pending && (
                <TargetPanel
                    item={item}
                    isFirstOfSet={isFirstOfSet}
                    perSetRounds={hasPerSetRounds(block)}
                    canGroup={index > 0}
                    secondsLocked={secondsLocked}
                    onChange={setItem}
                />
            )}
        </li>
    );
}

// --- Комплекс -----------------------------------------------------------------

const ORDER_OPTIONS: { value: ProgramBlockOrder; label: string }[] = [
    { value: "sequential", label: "По очереди: все подходы одного, потом следующее" },
    { value: "interleaved", label: "По кругу: по одному подходу каждого, и так несколько раз" },
];

function BlockSettings({
    block,
    onChange,
}: {
    block: ProgramBlock;
    onChange: (block: ProgramBlock) => void;
}) {
    const sets = getBlockSets(block);
    const supersets = hasSupersets(block);
    const circles = roundsAreCircles(block);
    const perSet = hasPerSetRounds(block);

    function patch(next: Partial<ProgramBlock>) {
        onChange(normalizeBlock(ensureSetRounds({ ...block, ...next })));
    }

    return (
        <div className="scheme-composer__panel">
            <label className="scheme-composer__field">
                <span className="scheme-composer__field-label">
                    Название комплекса (необязательно)
                </span>

                <input
                    type="text"
                    className="scheme-composer__input"
                    placeholder="Например: Разминка, Финишер, Турник"
                    maxLength={100}
                    value={block.title}
                    onChange={(event) => patch({ title: event.target.value })}
                />
            </label>

            <label className="scheme-composer__field">
                <span className="scheme-composer__field-label">
                    Примечание к комплексу (необязательно)
                </span>

                <textarea
                    className="scheme-composer__input scheme-composer__textarea"
                    rows={2}
                    value={block.note ?? ""}
                    onChange={(event) => patch({ note: event.target.value })}
                />
            </label>

            <div className="scheme-composer__fields">
                {perSet ? (
                    <p className="scheme-composer__hint">
                        Число подходов указывается у каждого{" "}
                        {supersets ? "сета" : "упражнения"} — нажмите на его
                        нагрузку.
                    </p>
                ) : (
                    <NumberField
                        label={circles ? "Число кругов" : "Число подходов"}
                        min={1}
                        max={MAX_ROUNDS}
                        value={block.rounds}
                        onChange={(rounds) => patch({ rounds: clampRounds(rounds) })}
                    />
                )}

                {sets.length > 1 && (
                    <label className="scheme-composer__field">
                        <span className="scheme-composer__field-label">
                            Порядок
                        </span>

                        <select
                            className="scheme-composer__input"
                            value={block.order ?? "sequential"}
                            onChange={(event) =>
                                patch({
                                    order: event.target.value as ProgramBlockOrder,
                                })
                            }
                        >
                            {ORDER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {hasEmomSet(block) && (
                    <label className="scheme-composer__field">
                        <span className="scheme-composer__field-label">
                            EMOM-упражнения в сете
                        </span>

                        <select
                            className="scheme-composer__input"
                            value={block.emomTogether ? "together" : "sequence"}
                            onChange={(event) =>
                                patch({
                                    emomTogether: event.target.value === "together",
                                })
                            }
                        >
                            <option value="sequence">
                                По очереди, у каждого свой интервал
                            </option>
                            <option value="together">
                                Все вместе за один интервал
                            </option>
                        </select>
                    </label>
                )}
            </div>

            <div className="scheme-composer__fields">
                <DurationField
                    label={circles ? "Отдых между кругами" : "Отдых между подходами"}
                    value={block.restBetweenRounds}
                    onChange={(restBetweenRounds) => patch({ restBetweenRounds })}
                />

                {sets.length > 1 && (
                    <DurationField
                        label={supersets ? "Отдых между сетами" : "Отдых между упражнениями"}
                        value={block.restBetweenSets}
                        onChange={(restBetweenSets) => patch({ restBetweenSets })}
                    />
                )}

                {supersets && (
                    <DurationField
                        label="Отдых внутри сета"
                        value={block.restWithinSet}
                        onChange={(restWithinSet) => patch({ restWithinSet })}
                    />
                )}

                <DurationField
                    label="Отдых после комплекса"
                    value={block.restAfterBlock}
                    onChange={(restAfterBlock) => patch({ restAfterBlock })}
                />
            </div>
        </div>
    );
}

function BlockCard({
    block,
    index,
    total,
    openKey,
    onToggle,
    onChange,
    onMove,
    onRemove,
}: {
    block: ProgramBlock;
    index: number;
    total: number;
    openKey: string | null;
    onToggle: (key: string) => void;
    onChange: (block: ProgramBlock) => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
}) {
    const keyPrefix = `block:${block.id}`;
    const settingsKey = `${keyPrefix}:settings`;
    const settingsOpen = openKey === settingsKey;

    const title = block.title.trim() || `Комплекс ${index + 1}`;
    const summary = describeAutoBlock(block);

    function addItem(grouped: boolean) {
        const last = block.items[block.items.length - 1];

        onChange(
            normalizeBlock(
                ensureSetRounds({
                    ...block,
                    items: [
                        ...block.items,
                        createPendingItem(
                            last?.target ? { ...last.target } : undefined,
                            grouped
                        ),
                    ],
                })
            )
        );
    }

    return (
        <section className="scheme-composer__block" aria-label={title}>
            <div className="scheme-composer__block-header">
                <h3 className="scheme-composer__block-title">{title}</h3>

                {summary.map((line) => (
                    <span key={line} className="scheme-composer__chip">
                        {line}
                    </span>
                ))}

                <button
                    type="button"
                    className="scheme-composer__settings-button"
                    aria-expanded={settingsOpen}
                    onClick={() => onToggle(settingsKey)}
                >
                    <span aria-hidden="true">⚙</span> Настроить комплекс{" "}
                    {settingsOpen ? "▴" : "▾"}
                </button>

                <MoveButtons
                    what={title}
                    canUp={index > 0}
                    canDown={index < total - 1}
                    onUp={() => onMove(-1)}
                    onDown={() => onMove(1)}
                    onRemove={onRemove}
                />
            </div>

            {settingsOpen && (
                <BlockSettings block={block} onChange={onChange} />
            )}

            <ol className="scheme-composer__items">
                {block.items.map((_, itemIndex) => (
                    <ItemRow
                        key={itemIndex}
                        block={block}
                        index={itemIndex}
                        openKey={openKey}
                        keyPrefix={keyPrefix}
                        onToggle={onToggle}
                        onChangeBlock={onChange}
                    />
                ))}
            </ol>

            <div className="scheme-composer__block-footer">
                <button
                    type="button"
                    className="scheme-composer__link-button"
                    onClick={() => addItem(false)}
                >
                    + Упражнение
                </button>

                {block.items.length > 0 && (
                    <button
                        type="button"
                        className="scheme-composer__link-button"
                        onClick={() => addItem(true)}
                    >
                        + В суперсет
                    </button>
                )}
            </div>
        </section>
    );
}

// --- Конструктор ---------------------------------------------------------------

function PresetPicker({
    onPick,
    title,
}: {
    onPick: (blockFactory: () => ProgramBlock) => void;
    title: string;
}) {
    return (
        <div className="scheme-composer__presets">
            <p className="scheme-composer__presets-title">{title}</p>

            <ul className="scheme-composer__preset-list">
                {SCHEME_PRESETS.map((preset) => (
                    <li key={preset.id}>
                        <button
                            type="button"
                            className="scheme-composer__preset"
                            onClick={() => onPick(preset.create)}
                        >
                            <span className="scheme-composer__preset-title">
                                {preset.title}
                            </span>

                            <span className="scheme-composer__preset-text">
                                {preset.description}
                            </span>
                        </button>
                    </li>
                ))}

                <li>
                    <button
                        type="button"
                        className="scheme-composer__preset"
                        onClick={() => onPick(createEmptyBlock)}
                    >
                        <span className="scheme-composer__preset-title">
                            С нуля
                        </span>

                        <span className="scheme-composer__preset-text">
                            Пустой комплекс, всё настрою сам.
                        </span>
                    </button>
                </li>
            </ul>
        </div>
    );
}

/**
 * Конструктор схемы тренировки. Выглядит как готовая схема
 * (ComplexSchemeView): комплексы, пронумерованные упражнения, плашки с
 * нагрузкой и подписью «как выполнять». Каждая плашка открывает свои
 * настройки; редкое (порядок, отдых, EMOM, суперсеты) спрятано в
 * «Настроить». Начинается с заготовок — «Подходы», «Круговая» и т. п.
 * Работает с моделью автоматических схем программ (ProgramBlock).
 */
export default function SchemeComposer({
    value,
    onChange,
    showProblems = true,
}: SchemeComposerProps) {
    const [openKey, setOpenKey] = useState<string | null>(null);

    const problems = getComposerProblems(value);

    function toggle(key: string) {
        setOpenKey((current) => (current === key ? null : key));
    }

    function updateBlock(index: number, block: ProgramBlock) {
        onChange(value.map((item, itemIndex) => (itemIndex === index ? block : item)));
    }

    function addBlock(factory: () => ProgramBlock) {
        onChange([...value, normalizeBlock(factory())]);
        setOpenKey(null);
    }

    return (
        <div className="scheme-composer">
            {value.length === 0 ? (
                <PresetPicker
                    title="Как вы тренировались? Выберите заготовку — числа можно поменять."
                    onPick={addBlock}
                />
            ) : (
                <>
                    {value.map((block, index) => (
                        <BlockCard
                            key={block.id}
                            block={block}
                            index={index}
                            total={value.length}
                            openKey={openKey}
                            onToggle={toggle}
                            onChange={(next) => updateBlock(index, next)}
                            onMove={(direction) => {
                                onChange(moveInList(value, index, direction));
                                setOpenKey(null);
                            }}
                            onRemove={() => {
                                onChange(value.filter((_, i) => i !== index));
                                setOpenKey(null);
                            }}
                        />
                    ))}

                    <PresetPicker title="Добавить комплекс" onPick={addBlock} />

                    {showProblems && problems.length > 0 && (
                        <ul className="scheme-composer__problems">
                            {problems.map((problem) => (
                                <li key={problem}>{problem}</li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
