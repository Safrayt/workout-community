import "../../styles/components/scheme-builder.css";

import ExerciseSearchInput from "../ExerciseSearchInput/ExerciseSearchInput";

import { useExercises } from "../../context/ExerciseContext";

import { formatSeconds } from "../../utils/complexScheme";
import { createEmptySchemeBlock } from "../../types/complexScheme";

import type { Exercise } from "../../types/exercise";
import type { SchemeBlock, SchemeItem } from "../../types/complexScheme";

type SchemeBuilderProps = {
    value: SchemeBlock[];
    onChange: (scheme: SchemeBlock[]) => void;

    /** Сообщения проверки схемы — показываются списком над кнопками. */
    errors?: string[];
};

// --- Режимы: как повторяется блок и какая нагрузка у строки ---------------

type RepeatMode = "once" | "rounds" | "sets" | "amrap";
type WorkMode = "reps" | "max" | "time" | "reps_time";

const DEFAULT_ROUNDS = 3;
const DEFAULT_AMRAP_SECONDS = 600;

function getRepeatMode(block: SchemeBlock): RepeatMode {
    if (block.rounds === null) return "amrap";
    if (block.roundsKind === "sets") return "sets";

    return block.rounds === 1 ? "once" : "rounds";
}

function getWorkMode(item: SchemeItem): WorkMode {
    if (item.maxEffort) return "max";
    if (item.reps !== null && item.durationSeconds !== null) return "reps_time";
    if (item.durationSeconds !== null) return "time";

    return "reps";
}

const repeatOptions: { value: RepeatMode; label: string }[] = [
    { value: "once", label: "Один раз" },
    { value: "rounds", label: "Несколько кругов" },
    { value: "sets", label: "Несколько подходов" },
    { value: "amrap", label: "Максимум кругов за время" },
];

const workOptions: { value: WorkMode; label: string }[] = [
    { value: "reps", label: "Повторения" },
    { value: "max", label: "Максимум повторений" },
    { value: "time", label: "Время (работа или удержание)" },
    { value: "reps_time", label: "Повторения за время" },
];

/** Пустое поле → null, иначе целое число (нечисловое → null). */
function toNumberOrNull(text: string): number | null {
    if (text.trim() === "") return null;

    const value = Number.parseInt(text, 10);

    return Number.isFinite(value) ? value : null;
}

function swap<T>(list: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction;

    if (target < 0 || target >= list.length) return list;

    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

/** Время словами рядом с полем секунд — чтобы 180 читалось как «3 минуты». */
function SecondsHint({ seconds }: { seconds: number | null }) {
    if (seconds === null || seconds < 60) return null;

    return <span className="scheme-builder__hint">= {formatSeconds(seconds)}</span>;
}

/**
 * Конструктор схемы комплекса. Схема — блоки; в блоке — упражнения из
 * базы упражнений (одно можно добавлять много раз) с нагрузкой.
 *
 *  - «Интервалы»: один блок «один раз», у строк — «максимум повторений за
 *    60 секунд».
 *  - «Круги»: один блок «несколько кругов», у строк — повторения.
 *  - «Подходы»: блок «несколько подходов».
 *  - «Суперсеты»: по блоку на каждый суперсет.
 *  - «Лесенка»: круги + изменение повторений за круг (с границей).
 */
export default function SchemeBuilder({ value, onChange, errors = [] }: SchemeBuilderProps) {
    const { getExerciseById } = useExercises();

    // --- блоки ---------------------------------------------------------------

    function setBlock(blockIndex: number, patch: Partial<SchemeBlock>) {
        onChange(value.map((block, index) => (index === blockIndex ? { ...block, ...patch } : block)));
    }

    function setRepeatMode(blockIndex: number, mode: RepeatMode) {
        const block = value[blockIndex];

        if (mode === "once") {
            // Один раз — прогрессия по кругам теряет смысл.
            setBlock(blockIndex, {
                rounds: 1,
                roundsKind: "rounds",
                restBetweenRoundsSeconds: null,
                items: block.items.map((item) => ({ ...item, repsStep: 0, repsLimit: null })),
            });
        } else if (mode === "amrap") {
            setBlock(blockIndex, {
                rounds: null,
                timeLimitSeconds: block.timeLimitSeconds ?? DEFAULT_AMRAP_SECONDS,
                restBetweenRoundsSeconds: null,
            });
        } else {
            setBlock(blockIndex, {
                rounds: block.rounds !== null && block.rounds > 1 ? block.rounds : DEFAULT_ROUNDS,
                roundsKind: mode,
            });
        }
    }

    function moveBlock(blockIndex: number, direction: -1 | 1) {
        onChange(swap(value, blockIndex, direction));
    }

    function removeBlock(blockIndex: number) {
        onChange(value.filter((_, index) => index !== blockIndex));
    }

    function duplicateBlock(blockIndex: number) {
        const copy: SchemeBlock = {
            ...value[blockIndex],
            items: value[blockIndex].items.map((item) => ({ ...item })),
        };

        onChange([...value.slice(0, blockIndex + 1), copy, ...value.slice(blockIndex + 1)]);
    }

    function addBlock() {
        onChange([...value, createEmptySchemeBlock()]);
    }

    // --- строки ---------------------------------------------------------------

    function setItem(blockIndex: number, itemIndex: number, patch: Partial<SchemeItem>) {
        const block = value[blockIndex];

        setBlock(blockIndex, {
            items: block.items.map((item, index) =>
                index === itemIndex ? { ...item, ...patch } : item
            ),
        });
    }

    function setWorkMode(blockIndex: number, itemIndex: number, mode: WorkMode) {
        const item = value[blockIndex].items[itemIndex];

        // Прогрессия бывает только у строк с числом повторений.
        const withoutProgression = { repsStep: 0, repsLimit: null };

        if (mode === "reps") {
            setItem(blockIndex, itemIndex, {
                maxEffort: false,
                reps: item.reps ?? 10,
                durationSeconds: null,
            });
        } else if (mode === "max") {
            setItem(blockIndex, itemIndex, {
                maxEffort: true,
                reps: null,
                ...withoutProgression,
            });
        } else if (mode === "time") {
            setItem(blockIndex, itemIndex, {
                maxEffort: false,
                reps: null,
                durationSeconds: item.durationSeconds ?? 30,
                ...withoutProgression,
            });
        } else {
            setItem(blockIndex, itemIndex, {
                maxEffort: false,
                reps: item.reps ?? 5,
                durationSeconds: item.durationSeconds ?? 40,
            });
        }
    }

    function addItem(blockIndex: number, exercise: Exercise) {
        const block = value[blockIndex];
        const previous = block.items[block.items.length - 1];

        // Новая строка наследует нагрузку предыдущей (в схемах она
        // обычно одинаковая) — остаётся поправить, что отличается.
        const item: SchemeItem = {
            exerciseId: exercise.id,
            reps: previous ? previous.reps : 10,
            maxEffort: previous ? previous.maxEffort : false,
            durationSeconds: previous ? previous.durationSeconds : null,
            repsStep: previous ? previous.repsStep : 0,
            repsLimit: previous ? previous.repsLimit : null,
            note: null,
        };

        setBlock(blockIndex, { items: [...block.items, item] });
    }

    function moveItem(blockIndex: number, itemIndex: number, direction: -1 | 1) {
        setBlock(blockIndex, { items: swap(value[blockIndex].items, itemIndex, direction) });
    }

    function removeItem(blockIndex: number, itemIndex: number) {
        setBlock(blockIndex, {
            items: value[blockIndex].items.filter((_, index) => index !== itemIndex),
        });
    }

    function duplicateItem(blockIndex: number, itemIndex: number) {
        const items = value[blockIndex].items;
        const copy = { ...items[itemIndex] };

        setBlock(blockIndex, {
            items: [...items.slice(0, itemIndex + 1), copy, ...items.slice(itemIndex + 1)],
        });
    }

    // --- разметка ----------------------------------------------------------------

    return (
        <div className="scheme-builder">
            <p className="scheme-builder__intro">
                Схема собирается из блоков. Один блок — простая схема (интервалы,
                круги, подходы). Несколько блоков — например, отдельные суперсеты.
                Одно и то же упражнение можно добавлять сколько угодно раз.
            </p>

            {
                value.map((block, blockIndex) => {
                    const repeatMode = getRepeatMode(block);
                    const repeatsMany = block.rounds !== 1;
                    const roundsName = block.roundsKind === "sets" ? "подходами" : "кругами";

                    return (
                        <section
                            className="scheme-builder__block"
                            key={blockIndex}
                            aria-label={`Блок ${blockIndex + 1}`}
                        >
                            <header className="scheme-builder__block-head">
                                <h4 className="scheme-builder__block-title">Блок {blockIndex + 1}</h4>

                                <div className="scheme-builder__actions">
                                    <button
                                        type="button"
                                        className="scheme-builder__icon"
                                        aria-label={`Поднять блок ${blockIndex + 1} выше`}
                                        disabled={blockIndex === 0}
                                        onClick={() => moveBlock(blockIndex, -1)}
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        className="scheme-builder__icon"
                                        aria-label={`Опустить блок ${blockIndex + 1} ниже`}
                                        disabled={blockIndex === value.length - 1}
                                        onClick={() => moveBlock(blockIndex, 1)}
                                    >
                                        ↓
                                    </button>

                                    <button
                                        type="button"
                                        className="scheme-builder__icon"
                                        aria-label={`Копировать блок ${blockIndex + 1}`}
                                        title="Копировать блок"
                                        onClick={() => duplicateBlock(blockIndex)}
                                    >
                                        ⧉
                                    </button>

                                    <button
                                        type="button"
                                        className="scheme-builder__icon scheme-builder__icon--remove"
                                        aria-label={`Удалить блок ${blockIndex + 1}`}
                                        disabled={value.length === 1}
                                        onClick={() => removeBlock(blockIndex)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </header>

                            <div className="scheme-builder__grid">
                                <label className="scheme-builder__field">
                                    <span>Название блока (необязательно)</span>
                                    <input
                                        type="text"
                                        className="scheme-builder__input"
                                        placeholder="Например: Суперсет 1"
                                        value={block.title ?? ""}
                                        onChange={(event) =>
                                            setBlock(blockIndex, { title: event.target.value || null })
                                        }
                                    />
                                </label>

                                <label className="scheme-builder__field">
                                    <span>Сколько раз повторить блок</span>
                                    <select
                                        className="scheme-builder__input"
                                        aria-label={`Повтор блока ${blockIndex + 1}`}
                                        value={repeatMode}
                                        onChange={(event) =>
                                            setRepeatMode(blockIndex, event.target.value as RepeatMode)
                                        }
                                    >
                                        {
                                            repeatOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </label>

                                {
                                    (repeatMode === "rounds" || repeatMode === "sets") && (
                                        <label className="scheme-builder__field">
                                            <span>
                                                {repeatMode === "sets" ? "Число подходов" : "Число кругов"}
                                            </span>
                                            <input
                                                type="number"
                                                min={1}
                                                className="scheme-builder__input"
                                                aria-label={`Число повторов блока ${blockIndex + 1}`}
                                                value={block.rounds ?? ""}
                                                onChange={(event) =>
                                                    setBlock(blockIndex, {
                                                        rounds: toNumberOrNull(event.target.value),
                                                    })
                                                }
                                            />
                                        </label>
                                    )
                                }

                                {
                                    repeatMode === "amrap" && (
                                        <label className="scheme-builder__field">
                                            <span>Лимит времени, секунд</span>
                                            <input
                                                type="number"
                                                min={1}
                                                className="scheme-builder__input"
                                                aria-label={`Лимит времени блока ${blockIndex + 1}`}
                                                value={block.timeLimitSeconds ?? ""}
                                                onChange={(event) =>
                                                    setBlock(blockIndex, {
                                                        timeLimitSeconds: toNumberOrNull(event.target.value),
                                                    })
                                                }
                                            />
                                            <SecondsHint seconds={block.timeLimitSeconds} />
                                        </label>
                                    )
                                }
                            </div>

                            <details className="scheme-builder__more">
                                <summary>Отдых и лимит времени</summary>

                                <div className="scheme-builder__grid">
                                    <label className="scheme-builder__field">
                                        <span>Отдых между упражнениями, сек</span>
                                        <input
                                            type="number"
                                            min={0}
                                            className="scheme-builder__input"
                                            aria-label={`Отдых между упражнениями блока ${blockIndex + 1}`}
                                            value={block.restBetweenItemsSeconds ?? ""}
                                            onChange={(event) =>
                                                setBlock(blockIndex, {
                                                    restBetweenItemsSeconds: toNumberOrNull(event.target.value),
                                                })
                                            }
                                        />
                                        <SecondsHint seconds={block.restBetweenItemsSeconds} />
                                    </label>

                                    {
                                        repeatsMany && repeatMode !== "amrap" && (
                                            <label className="scheme-builder__field">
                                                <span>Отдых между {roundsName}, сек</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="scheme-builder__input"
                                                    aria-label={`Отдых между повторами блока ${blockIndex + 1}`}
                                                    value={block.restBetweenRoundsSeconds ?? ""}
                                                    onChange={(event) =>
                                                        setBlock(blockIndex, {
                                                            restBetweenRoundsSeconds: toNumberOrNull(
                                                                event.target.value
                                                            ),
                                                        })
                                                    }
                                                />
                                                <SecondsHint seconds={block.restBetweenRoundsSeconds} />
                                            </label>
                                        )
                                    }

                                    {
                                        repeatMode !== "amrap" && (
                                            <label className="scheme-builder__field">
                                                <span>Лимит времени блока, сек (необязательно)</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="scheme-builder__input"
                                                    aria-label={`Необязательный лимит времени блока ${blockIndex + 1}`}
                                                    value={block.timeLimitSeconds ?? ""}
                                                    onChange={(event) =>
                                                        setBlock(blockIndex, {
                                                            timeLimitSeconds: toNumberOrNull(event.target.value),
                                                        })
                                                    }
                                                />
                                                <SecondsHint seconds={block.timeLimitSeconds} />
                                            </label>
                                        )
                                    }
                                </div>
                            </details>

                            {
                                block.items.length === 0 && (
                                    <p className="scheme-builder__empty">
                                        В блоке пока нет упражнений — добавьте их ниже.
                                    </p>
                                )
                            }

                            <ol className="scheme-builder__items">
                                {
                                    block.items.map((item, itemIndex) => {
                                        const exercise = getExerciseById(item.exerciseId);
                                        const title = exercise?.name ?? `Не найдено: ${item.exerciseId}`;
                                        const workMode = getWorkMode(item);
                                        const hasReps = workMode === "reps" || workMode === "reps_time";
                                        const hasDuration = workMode !== "reps";

                                        return (
                                            <li
                                                key={itemIndex}
                                                className={
                                                    exercise
                                                        ? "scheme-builder__item"
                                                        : "scheme-builder__item scheme-builder__item--missing"
                                                }
                                            >
                                                <div className="scheme-builder__item-head">
                                                    <span className="scheme-builder__item-name">{title}</span>

                                                    <div className="scheme-builder__actions">
                                                        <button
                                                            type="button"
                                                            className="scheme-builder__icon"
                                                            aria-label={`Поднять выше: ${title}`}
                                                            disabled={itemIndex === 0}
                                                            onClick={() => moveItem(blockIndex, itemIndex, -1)}
                                                        >
                                                            ↑
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="scheme-builder__icon"
                                                            aria-label={`Опустить ниже: ${title}`}
                                                            disabled={itemIndex === block.items.length - 1}
                                                            onClick={() => moveItem(blockIndex, itemIndex, 1)}
                                                        >
                                                            ↓
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="scheme-builder__icon"
                                                            aria-label={`Добавить ещё раз: ${title}`}
                                                            title="Добавить ещё раз"
                                                            onClick={() => duplicateItem(blockIndex, itemIndex)}
                                                        >
                                                            ⧉
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="scheme-builder__icon scheme-builder__icon--remove"
                                                            aria-label={`Убрать из блока: ${title}`}
                                                            onClick={() => removeItem(blockIndex, itemIndex)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="scheme-builder__grid">
                                                    <label className="scheme-builder__field">
                                                        <span>Нагрузка</span>
                                                        <select
                                                            className="scheme-builder__input"
                                                            aria-label={`Нагрузка: ${title}`}
                                                            value={workMode}
                                                            onChange={(event) =>
                                                                setWorkMode(
                                                                    blockIndex,
                                                                    itemIndex,
                                                                    event.target.value as WorkMode
                                                                )
                                                            }
                                                        >
                                                            {
                                                                workOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    </label>

                                                    {
                                                        hasReps && (
                                                            <label className="scheme-builder__field">
                                                                <span>Повторений</span>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    className="scheme-builder__input"
                                                                    aria-label={`Повторений: ${title}`}
                                                                    value={item.reps ?? ""}
                                                                    onChange={(event) =>
                                                                        setItem(blockIndex, itemIndex, {
                                                                            reps: toNumberOrNull(event.target.value),
                                                                        })
                                                                    }
                                                                />
                                                            </label>
                                                        )
                                                    }

                                                    {
                                                        hasDuration && (
                                                            <label className="scheme-builder__field">
                                                                <span>
                                                                    {
                                                                        workMode === "max"
                                                                            ? "За сколько секунд (необязательно)"
                                                                            : "Секунд"
                                                                    }
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    className="scheme-builder__input"
                                                                    aria-label={`Секунд: ${title}`}
                                                                    value={item.durationSeconds ?? ""}
                                                                    onChange={(event) =>
                                                                        setItem(blockIndex, itemIndex, {
                                                                            durationSeconds: toNumberOrNull(
                                                                                event.target.value
                                                                            ),
                                                                        })
                                                                    }
                                                                />
                                                                <SecondsHint seconds={item.durationSeconds} />
                                                            </label>
                                                        )
                                                    }

                                                    {
                                                        hasReps && repeatsMany && repeatMode !== "amrap" && (
                                                            <>
                                                                <label className="scheme-builder__field">
                                                                    <span>
                                                                        Менять за {block.roundsKind === "sets" ? "подход" : "круг"}
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        className="scheme-builder__input"
                                                                        aria-label={`Изменение повторений: ${title}`}
                                                                        placeholder="0"
                                                                        value={item.repsStep === 0 ? "" : item.repsStep}
                                                                        onChange={(event) =>
                                                                            setItem(blockIndex, itemIndex, {
                                                                                repsStep:
                                                                                    toNumberOrNull(event.target.value) ?? 0,
                                                                            })
                                                                        }
                                                                    />
                                                                </label>

                                                                {
                                                                    item.repsStep !== 0 && (
                                                                        <label className="scheme-builder__field">
                                                                            <span>
                                                                                {
                                                                                    item.repsStep < 0
                                                                                        ? "Не ниже"
                                                                                        : "Не больше"
                                                                                }
                                                                            </span>
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                className="scheme-builder__input"
                                                                                aria-label={`Граница прогрессии: ${title}`}
                                                                                value={item.repsLimit ?? ""}
                                                                                onChange={(event) =>
                                                                                    setItem(blockIndex, itemIndex, {
                                                                                        repsLimit: toNumberOrNull(
                                                                                            event.target.value
                                                                                        ),
                                                                                    })
                                                                                }
                                                                            />
                                                                        </label>
                                                                    )
                                                                }
                                                            </>
                                                        )
                                                    }

                                                </div>

                                                {/* Пояснение нужно не всем строкам — прячем, чтобы форма не
                                                    разрасталась; заполненное остаётся раскрытым. */}
                                                <details
                                                    className="scheme-builder__more"
                                                    open={item.note ? true : undefined}
                                                >
                                                    <summary>Пояснение к упражнению</summary>

                                                    <input
                                                        type="text"
                                                        className="scheme-builder__input"
                                                        aria-label={`Пояснение: ${title}`}
                                                        placeholder="Например: хват чуть шире плеч"
                                                        value={item.note ?? ""}
                                                        onChange={(event) =>
                                                            setItem(blockIndex, itemIndex, {
                                                                note: event.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </details>
                                            </li>
                                        );
                                    })
                                }
                            </ol>

                            <ExerciseSearchInput
                                label={`Добавить упражнение в блок ${blockIndex + 1}`}
                                onSelect={(exercise) => addItem(blockIndex, exercise)}
                            />
                        </section>
                    );
                })
            }

            {
                errors.length > 0 && (
                    <ul className="scheme-builder__errors" role="alert">
                        {errors.map((message, index) => (
                            <li key={index}>{message}</li>
                        ))}
                    </ul>
                )
            }

            <button type="button" className="scheme-builder__add-block" onClick={addBlock}>
                + Добавить блок
            </button>
        </div>
    );
}
