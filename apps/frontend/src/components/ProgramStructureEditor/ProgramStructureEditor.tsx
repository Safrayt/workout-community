import { Fragment, useId, useMemo, useRef, useState } from "react";

import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";
import ExerciseSearchBox from "../ExerciseSearchBox/ExerciseSearchBox";

import "../../styles/components/program-structure-editor.css";

import { generateLocalId } from "../../api/mappers/program";
import { useExercises } from "../../context/ExerciseContext";
import type {
    ProgramBlock,
    ProgramBlockItem,
    ProgramBlockOrder,
    ProgramItemTarget,
    ProgramScheme,
    ProgramSchemeMode,
    ProgramSection,
    ProgramStructure,
    ProgramTargetKind,
} from "../../types/program";
import {
    MAX_REST_SECONDS,
    MAX_ROUNDS,
    MAX_TARGET_REPS,
    MAX_TARGET_SECONDS,
    getAutoSchemeProblems,
    getBlockSets,
    getSetRounds,
    hasPerSetRounds,
    hasSupersets,
} from "../../utils/programAuto";

// =====================================================================
// Общие мелкие помощники для "добавить / удалить / переставить
// местами" внутри массива — используются на всех трёх уровнях
// вложенности (разделы, схемы, блоки) и для списка упражнений.
// Явные кнопки "вверх/вниз" вместо drag-and-drop — в проекте нигде
// больше нет перетаскивания (см. ComplexForm.tsx),
// так что это осознанный выбор в пользу единообразия, а не упрощение
// от нехватки времени.
// =====================================================================

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
        return items;
    }

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    return next;
}

function ReorderButtons({
    index,
    count,
    onMove,
}: {
    index: number;
    count: number;
    onMove: (direction: -1 | 1) => void;
}) {
    return (
        <div className="program-structure-editor__reorder">
            <button
                type="button"
                className="program-structure-editor__icon-button"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                aria-label="Переместить выше"
            >
                ↑
            </button>

            <button
                type="button"
                className="program-structure-editor__icon-button"
                disabled={index === count - 1}
                onClick={() => onMove(1)}
                aria-label="Переместить ниже"
            >
                ↓
            </button>
        </div>
    );
}

/**
 * Сворачивание — чисто состояние экрана, не часть данных структуры
 * (см. types/program.ts): один и тот же раздел/схема может быть
 * свёрнут у одного автора и развёрнут у другого, ничего из этого не
 * сохраняется на сервере.
 */
function CollapseToggle({
    isCollapsed,
    onToggle,
    label,
}: {
    isCollapsed: boolean;
    onToggle: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            className="program-structure-editor__collapse-toggle"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? `Развернуть ${label}` : `Свернуть ${label}`}
        >
            {isCollapsed ? "▸" : "▾"}
        </button>
    );
}

// =====================================================================
// Поля автоматических схем — числа вместо свободного текста. Только в
// схемах с режимом «Автоматическая» (см. ProgramSchemeMode).
// =====================================================================

/** Подписанный выпадающий список в стиле остальных полей формы (общий
 *  ui/Select всегда добавляет пустой пункт, а здесь он не нужен). */
function LabeledSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    const id = useId();

    return (
        <div className="select">
            <label className="select__label" htmlFor={id}>
                {label}
            </label>

            <select
                id={id}
                className="select__field"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {
                    options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))
                }
            </select>
        </div>
    );
}

/** Целое число из поля ввода: пусто — undefined, иначе в границах. */
function parseWholeNumber(
    raw: string,
    min: number,
    max: number
): number | undefined {
    if (raw.trim() === "") {
        return undefined;
    }

    const parsed = Math.floor(Number(raw));

    if (Number.isNaN(parsed)) {
        return undefined;
    }

    return Math.min(max, Math.max(min, parsed));
}

/** Отдых в секундах, вводится как «минуты + секунды». */
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
            (parseWholeNumber(nextMinutes, 0, 60) ?? 0) * 60 +
            (parseWholeNumber(nextSeconds, 0, 59) ?? 0);

        onChange(Math.min(MAX_REST_SECONDS, total));
    }

    return (
        <div className="program-structure-editor__duration">
            <span className="program-structure-editor__field-label">
                {label}
            </span>

            <div className="program-structure-editor__duration-inputs">
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={60}
                    className="input__field program-structure-editor__number"
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
                    className="input__field program-structure-editor__number"
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

/**
 * Цель упражнения: повторения, секунды или «максимум» и число (у
 * «максимума» это примерный результат, с которого начнётся отметка
 * повторений после подхода). Для секунд можно
 * включить «Считать повторения» — когда за время выполняются повторения
 * (подтягивания за 30 секунд), а не статическое удержание; тогда
 * задаётся ориентир повторений. Человеку во время выполнения он не
 * показывается: после подхода он отмечает и секунды, и повторения, а
 * ориентир подставляется как значение по умолчанию.
 */
function TargetField({
    index,
    target,
    onChange,
}: {
    index: number;
    target: ProgramItemTarget | undefined;
    onChange: (target: ProgramItemTarget) => void;
}) {
    const kind: ProgramTargetKind = target?.kind ?? "reps";
    const max = kind === "seconds" ? MAX_TARGET_SECONDS : MAX_TARGET_REPS;
    const withReps = kind === "seconds" && target?.withReps === true;

    return (
        <div className="program-structure-editor__target">
            <select
                className="select__field program-structure-editor__target-kind"
                aria-label={`Что задано в упражнении ${index + 1}`}
                value={kind}
                onChange={(event) => {
                    const nextKind = event.target.value as ProgramTargetKind;

                    // Повторения за время бывают только у секунд.
                    onChange({
                        kind: nextKind,
                        value: target?.value,
                        ...(nextKind === "seconds"
                            ? { withReps: target?.withReps, reps: target?.reps }
                            : {}),
                    });
                }}
            >
                <option value="reps">Повторения</option>
                <option value="seconds">Секунды</option>
                <option value="max">Максимум</option>
            </select>

            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                className="input__field program-structure-editor__number"
                aria-label={
                    kind === "seconds"
                        ? `Число секунд в упражнении ${index + 1}`
                        : kind === "max"
                          ? `Примерное число повторений в максимуме, упражнение ${index + 1}`
                          : `Число повторений в упражнении ${index + 1}`
                }
                placeholder={
                    kind === "seconds"
                        ? "Секунд"
                        : kind === "max"
                          ? "Примерно повторений"
                          : "Повторений"
                }
                value={target?.value ?? ""}
                onChange={(event) =>
                    onChange({
                        ...target,
                        kind,
                        value: parseWholeNumber(event.target.value, 1, max),
                    })
                }
            />

            <label
                className={
                    kind === "seconds"
                        ? "program-structure-editor__check"
                        : "program-structure-editor__check program-structure-editor__check--disabled"
                }
            >
                <input
                    type="checkbox"
                    disabled={kind !== "seconds"}
                    checked={withReps}
                    onChange={(event) =>
                        onChange({
                            kind,
                            value: target?.value,
                            withReps: event.target.checked,
                            reps: event.target.checked ? target?.reps : undefined,
                        })
                    }
                />
                Считать повторения
            </label>

            {
                kind === "max" && (
                    <span className="program-structure-editor__hint">
                        Человеку во время выполнения покажется слово
                        «Максимум». Число — примерный результат: после
                        подхода отметка повторений начнётся с него.
                    </span>
                )
            }

            {
                withReps && (
                    <div className="program-structure-editor__target-reps">
                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_TARGET_REPS}
                            className="input__field program-structure-editor__number"
                            aria-label={`Ориентир повторений в упражнении ${index + 1}`}
                            placeholder="Повторений"
                            value={target?.reps ?? ""}
                            onChange={(event) =>
                                onChange({
                                    ...target,
                                    kind,
                                    reps: parseWholeNumber(
                                        event.target.value,
                                        1,
                                        MAX_TARGET_REPS
                                    ),
                                })
                            }
                        />

                        <span className="program-structure-editor__hint">
                            Ориентир, человеку во время выполнения не
                            показывается: после подхода он отметит и секунды,
                            и сколько повторений сделал.
                        </span>
                    </div>
                )
            }
        </div>
    );
}

// =====================================================================
// Упражнения (п.14-15 документа) — из базы упражнений (ссылкой) или
// своим текстом, порядок фиксирует автор, система его не интерпретирует.
// Упражнения из базы связаны с их страницами и дают мышцы для картинки
// схемы; своим текстом записывают то, чего в базе нет.
// =====================================================================

// Должно совпадать с MAX_BLOCK_EXERCISE_LOAD_LENGTH в app/models_program.py.
const MAX_LOAD_LENGTH = 100;

// Подсказки для поля «Нагрузка» — только подсказки: можно ввести что
// угодно (система нагрузку не разбирает, см. ProgramBlockItem.load).
const LOAD_SUGGESTIONS = [
    "Максимум",
    "Технический максимум",
    "80% от максимума",
    "20 повторений",
    "30 секунд",
    "1 минута",
];

function ExerciseListEditor({
    items,
    isAuto,
    perSetRounds,
    defaultRounds,
    onChange,
}: {
    items: ProgramBlockItem[];
    isAuto: boolean;

    /** У каждого сета своё число подходов (несколько сетов «по очереди»). */
    perSetRounds: boolean;

    /** Число подходов комплекса — по умолчанию для сетов без своего. */
    defaultRounds: number | undefined;
    onChange: (items: ProgramBlockItem[]) => void;
}) {
    const { exercises } = useExercises();

    const loadListId = useId();

    const nameById = useMemo(
        () => new Map(exercises.map((exercise) => [exercise.id, exercise.name])),
        [exercises]
    );

    function updateText(index: number, text: string) {
        onChange(
            items.map((item, i) =>
                i === index && item.kind === "text" ? { ...item, text } : item
            )
        );
    }

    function updateLoad(index: number, load: string) {
        onChange(
            items.map((item, i) => (i === index ? { ...item, load } : item))
        );
    }

    function updateTarget(index: number, target: ProgramItemTarget) {
        onChange(
            items.map((item, i) => (i === index ? { ...item, target } : item))
        );
    }

    function updateRounds(index: number, rounds: number | undefined) {
        onChange(
            items.map((item, i) => (i === index ? { ...item, rounds } : item))
        );
    }

    function updateGrouping(index: number, groupWithPrevious: boolean) {
        onChange(
            items.map((item, i) =>
                i === index ? { ...item, groupWithPrevious } : item
            )
        );
    }

    // Номера сетов — только когда в комплексе есть суперсеты: иначе
    // каждое упражнение и есть сет, и подписи «Сет 1…» только мешали бы.
    const showSets = isAuto && items.some(
        (item, index) => index > 0 && item.groupWithPrevious
    );
    let setNumber = 0;

    function removeItem(index: number) {
        onChange(items.filter((_, i) => i !== index));
    }

    function moveEntry(index: number, direction: -1 | 1) {
        onChange(moveItem(items, index, direction));
    }

    return (
        <div className="program-structure-editor__exercises">
            <span className="program-structure-editor__field-label">
                Упражнения
            </span>

            {
                items.map((item, index) => {
                    const startsSet = index === 0 || !item.groupWithPrevious;

                    if (startsSet) {
                        setNumber += 1;
                    }

                    return (
                    <Fragment key={index}>
                    {
                        showSets && startsSet && (
                            <span className="program-structure-editor__set-label">
                                Сет {setNumber}
                            </span>
                        )
                    }

                    <div
                        className={
                            showSets && !startsSet
                                ? "program-structure-editor__exercise-row program-structure-editor__exercise-row--grouped"
                                : "program-structure-editor__exercise-row"
                        }
                    >
                        <span className="program-structure-editor__exercise-index">
                            {index + 1}.
                        </span>

                        <div className="program-structure-editor__exercise-fields">
                            {
                                item.kind === "exercise" ? (
                                    <span className="program-structure-editor__exercise-linked">
                                        {nameById.get(item.exerciseId) ?? `Не найдено: ${item.exerciseId}`}

                                        <span className="program-structure-editor__exercise-badge">
                                            из базы
                                        </span>
                                    </span>
                                ) : (
                                    <Input
                                        aria-label={`Упражнение ${index + 1}`}
                                        value={item.text}
                                        onChange={(event) =>
                                            updateText(index, event.target.value)
                                        }
                                        placeholder="Своё упражнение, например: Ходьба на руках"
                                    />
                                )
                            }

                            {
                                isAuto ? (
                                    <>
                                        <div className="program-structure-editor__auto-row">
                                            <TargetField
                                                index={index}
                                                target={item.target}
                                                onChange={(target) =>
                                                    updateTarget(index, target)
                                                }
                                            />

                                            {
                                                perSetRounds && startsSet && (
                                                    <label className="program-structure-editor__rounds">
                                                        <span>Подходов</span>

                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={1}
                                                            max={MAX_ROUNDS}
                                                            className="input__field program-structure-editor__number"
                                                            aria-label={`Число подходов в сете с упражнением ${index + 1}`}
                                                            value={item.rounds ?? defaultRounds ?? ""}
                                                            onChange={(event) =>
                                                                updateRounds(
                                                                    index,
                                                                    parseWholeNumber(event.target.value, 1, MAX_ROUNDS)
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                )
                                            }
                                        </div>

                                        {
                                            index > 0 && (
                                                <label className="program-structure-editor__check">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.groupWithPrevious ?? false}
                                                        onChange={(event) =>
                                                            updateGrouping(index, event.target.checked)
                                                        }
                                                    />
                                                    В одном сете с предыдущим
                                                </label>
                                            )
                                        }

                                        <Input
                                            aria-label={`Примечание к упражнению ${index + 1}`}
                                            maxLength={MAX_LOAD_LENGTH}
                                            value={item.load ?? ""}
                                            onChange={(event) =>
                                                updateLoad(index, event.target.value)
                                            }
                                            placeholder="Примечание (необязательно), например: сумма на обе ноги"
                                        />
                                    </>
                                ) : (
                                    <Input
                                        aria-label={`Нагрузка упражнения ${index + 1}`}
                                        list={loadListId}
                                        maxLength={MAX_LOAD_LENGTH}
                                        value={item.load ?? ""}
                                        onChange={(event) =>
                                            updateLoad(index, event.target.value)
                                        }
                                        placeholder="Нагрузка: 20 повторений, максимум, 30 секунд…"
                                    />
                                )
                            }
                        </div>

                        <ReorderButtons
                            index={index}
                            count={items.length}
                            onMove={(direction) => moveEntry(index, direction)}
                        />

                        <button
                            type="button"
                            className="program-structure-editor__remove-button"
                            onClick={() => removeItem(index)}
                        >
                            Удалить
                        </button>
                    </div>
                    </Fragment>
                    );
                })
            }

            <datalist id={loadListId}>
                {
                    LOAD_SUGGESTIONS.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                    ))
                }
            </datalist>

            <ExerciseSearchBox
                onSelect={(exercise) =>
                    onChange([
                        ...items,
                        { kind: "exercise", exerciseId: exercise.id },
                    ])
                }
                emptyText="В базе нет упражнений."
            />

            <div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onChange([...items, { kind: "text", text: "" }])}
                >
                    Добавить своё упражнение (нет в базе)
                </Button>
            </div>

            <p className="program-structure-editor__hint">
                {
                    isAuto
                        ? "Упражнения из базы становятся ссылками, а их мышцы попадают на картинку схемы. Для каждого упражнения выберите, что задано — повторения или секунды, и укажите число: это ориентир, фактический результат человек отметит сам. У упражнения на секунды включите «Считать повторения», если за это время выполняются повторения (подтягивания за 30 секунд), а не удержание позы. Если упражнения образуют суперсет, отметьте «В одном сете с предыдущим»."
                        : "Упражнения из базы становятся ссылками, а их мышцы попадают на картинку схемы. Если нужного упражнения в базе нет, добавьте своё — оно останется обычным текстом. В поле «Нагрузка» можно написать что угодно: сколько повторений или секунд, «максимум», «80% от максимума»."
                }
            </p>
        </div>
    );
}

// =====================================================================
// Блок (п.12-17) — в интерфейсе называется "Комплекс" (более
// привычное тренирующимся слово для той же сущности; название полей
// в коде и на бэкенде не меняем). Название обязательно, всё
// остальное свободный текст автора. Комплексы не сворачиваются — их
// и так не бывает много внутри одной схемы, в отличие от разделов и
// схем самой программы.
// =====================================================================

const ORDER_OPTIONS: { value: ProgramBlockOrder; label: string }[] = [
    {
        value: "sequential",
        label: "По очереди — сет 1 несколько раз, затем сет 2",
    },
    {
        value: "interleaved",
        label: "По кругу — сет 1, сет 2 … и так несколько раз подряд",
    },
];

/** Числа комплекса автоматической схемы: сколько раз повторять и отдых. */
function AutoBlockFields({
    block,
    onChange,
}: {
    block: ProgramBlock;
    onChange: (block: ProgramBlock) => void;
}) {
    const setsCount = getBlockSets(block).length;
    const supersets = hasSupersets(block);
    const order = block.order ?? "sequential";
    const perSet = hasPerSetRounds(block);

    // Самое большое число повторений среди сетов: отдых между
    // подходами нужен, если хотя бы где-то подход не один.
    const maxRounds = Math.max(
        ...getSetRounds(block).map((rounds) => rounds ?? 1)
    );

    const roundsAreCircles =
        order === "interleaved" || (setsCount === 1 && supersets);

    return (
        <div className="program-structure-editor__auto-fields">
            {
                perSet ? (
                    <p className="program-structure-editor__hint">
                        Число подходов укажите у каждого{" "}
                        {supersets ? "сета" : "упражнения"} выше — оно может
                        быть разным.
                    </p>
                ) : (
                    <Input
                        label={roundsAreCircles ? "Число кругов" : "Число подходов"}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_ROUNDS}
                        value={block.rounds ?? ""}
                        onChange={(event) =>
                            onChange({
                                ...block,
                                rounds: parseWholeNumber(event.target.value, 1, MAX_ROUNDS),
                            })
                        }
                    />
                )
            }

            {
                setsCount > 1 && (
                    <LabeledSelect
                        label="Порядок сетов"
                        value={order}
                        options={ORDER_OPTIONS}
                        onChange={(value) =>
                            onChange({ ...block, order: value as ProgramBlockOrder })
                        }
                    />
                )
            }

            {
                maxRounds > 1 && (
                    <DurationField
                        label={roundsAreCircles ? "Отдых между кругами" : "Отдых между подходами"}
                        value={block.restBetweenRounds}
                        onChange={(restBetweenRounds) =>
                            onChange({ ...block, restBetweenRounds })
                        }
                    />
                )
            }

            {
                setsCount > 1 && (
                    <DurationField
                        label={supersets ? "Отдых между сетами" : "Отдых между упражнениями"}
                        value={block.restBetweenSets}
                        onChange={(restBetweenSets) =>
                            onChange({ ...block, restBetweenSets })
                        }
                    />
                )
            }

            {
                supersets && (
                    <DurationField
                        label="Отдых внутри сета, между упражнениями (необязательно)"
                        value={block.restWithinSet}
                        onChange={(restWithinSet) =>
                            onChange({ ...block, restWithinSet })
                        }
                    />
                )
            }

            <DurationField
                label="Отдых после комплекса, перед следующим (необязательно)"
                value={block.restAfterBlock}
                onChange={(restAfterBlock) =>
                    onChange({ ...block, restAfterBlock })
                }
            />
        </div>
    );
}

function BlockEditor({
    block,
    isAuto,
    onChange,
}: {
    block: ProgramBlock;
    isAuto: boolean;
    onChange: (block: ProgramBlock) => void;
}) {
    return (
        <div className="program-structure-editor__block">
            <Input
                label="Название комплекса"
                value={block.title}
                onChange={(event) =>
                    onChange({ ...block, title: event.target.value })
                }
                placeholder="Например: Комплекс 1, Финишер, Турник…"
            />

            <ExerciseListEditor
                items={block.items}
                isAuto={isAuto}
                perSetRounds={isAuto && hasPerSetRounds(block)}
                defaultRounds={block.rounds}
                onChange={(items) => onChange({ ...block, items })}
            />

            {
                isAuto ? (
                    <AutoBlockFields block={block} onChange={onChange} />
                ) : (
                    <Input
                        label="Схема / описание выполнения (необязательно)"
                        value={block.scheme ?? ""}
                        onChange={(event) =>
                            onChange({ ...block, scheme: event.target.value })
                        }
                        placeholder="Например: 5 × 10 или 4 круга по 10+5+5"
                    />
                )
            }

            <Textarea
                id={`block-note-${block.id}`}
                label="Примечание автора (необязательно)"
                value={block.note ?? ""}
                onChange={(event) =>
                    onChange({ ...block, note: event.target.value })
                }
                rows={2}
            />

            {
                !isAuto && (
                    <Input
                        label="Отдых (необязательно)"
                        value={block.rest ?? ""}
                        onChange={(event) =>
                            onChange({ ...block, rest: event.target.value })
                        }
                        placeholder="Например: 60-90 секунд или полное восстановление"
                    />
                )
            }
        </div>
    );
}

function BlockListEditor({
    blocks,
    isAuto,
    onChange,
}: {
    blocks: ProgramBlock[];
    isAuto: boolean;
    onChange: (blocks: ProgramBlock[]) => void;
}) {
    function updateBlock(index: number, block: ProgramBlock) {
        onChange(blocks.map((item, i) => (i === index ? block : item)));
    }

    function removeBlock(index: number) {
        onChange(blocks.filter((_, i) => i !== index));
    }

    function moveBlock(index: number, direction: -1 | 1) {
        onChange(moveItem(blocks, index, direction));
    }

    function addBlock() {
        onChange([
            ...blocks,
            {
                id: generateLocalId("block"),
                title: "",
                items: [],
                // В автоматической схеме комплекс по умолчанию делается
                // один раз — число повторений автор меняет сам.
                ...(isAuto ? { rounds: 1 } : {}),
            },
        ]);
    }

    return (
        <div className="program-structure-editor__blocks">
            {
                blocks.map((block, index) => (
                    <div
                        key={block.id}
                        className="program-structure-editor__block-wrapper"
                    >
                        <div className="program-structure-editor__item-header">
                            <span className="program-structure-editor__item-title">
                                Комплекс {index + 1}
                            </span>

                            <ReorderButtons
                                index={index}
                                count={blocks.length}
                                onMove={(direction) =>
                                    moveBlock(index, direction)
                                }
                            />

                            <button
                                type="button"
                                className="program-structure-editor__remove-button"
                                onClick={() => removeBlock(index)}
                            >
                                Удалить комплекс
                            </button>
                        </div>

                        <BlockEditor
                            block={block}
                            isAuto={isAuto}
                            onChange={(updated) => updateBlock(index, updated)}
                        />
                    </div>
                ))
            }

            <Button type="button" variant="outline" onClick={addBlock}>
                Добавить комплекс
            </Button>
        </div>
    );
}

// =====================================================================
// Схема (п.11) — одна тренировочная последовательность из одного или
// нескольких блоков. Своё собственное состояние "свёрнута/развёрнута"
// живёт в SchemeItem, а не в SchemeEditor — так тело схемы можно не
// рендерить вовсе, пока она свёрнута.
// =====================================================================

const MODE_OPTIONS: { value: ProgramSchemeMode; label: string }[] = [
    {
        value: "free",
        label: "Свободная — всё текстом, без таймеров",
    },
    {
        value: "auto",
        label: "Автоматическая — для прохождения с таймерами",
    },
];

function SchemeEditor({
    scheme,
    onChange,
}: {
    scheme: ProgramScheme;
    onChange: (scheme: ProgramScheme) => void;
}) {
    const isAuto = scheme.mode === "auto";
    const problems = getAutoSchemeProblems(scheme);

    function changeMode(mode: ProgramSchemeMode) {
        if (mode === "auto") {
            // Комплексам, у которых ещё нет числа повторений, ставим 1 —
            // нейтральное значение, автор поменяет его сам.
            onChange({
                ...scheme,
                mode,
                blocks: scheme.blocks.map((block) => ({
                    ...block,
                    rounds: block.rounds ?? 1,
                })),
            });
            return;
        }

        // Введённые числа не стираем: при возврате в «автоматическую»
        // они снова будут на месте, а свободная схема их просто не
        // использует.
        onChange({ ...scheme, mode });
    }

    return (
        <div className="program-structure-editor__scheme">
            <Input
                label="Название схемы"
                value={scheme.name}
                onChange={(event) =>
                    onChange({ ...scheme, name: event.target.value })
                }
                placeholder="Например: Тренировка A"
            />

            <LabeledSelect
                label="Режим схемы"
                value={isAuto ? "auto" : "free"}
                options={MODE_OPTIONS}
                onChange={(value) => changeMode(value as ProgramSchemeMode)}
            />

            {
                isAuto ? (
                    problems.length > 0 ? (
                        <div className="program-structure-editor__problems">
                            <p>
                                Чтобы по схеме можно было проходить тренировку
                                с таймерами, заполните:
                            </p>

                            <ul>
                                {
                                    problems.map((problem) => (
                                        <li key={problem}>{problem}</li>
                                    ))
                                }
                            </ul>

                            <p>
                                Версию с неполной автоматической схемой
                                опубликовать нельзя.
                            </p>
                        </div>
                    ) : (
                        <p className="program-structure-editor__ready">
                            Схема заполнена полностью — по ней можно
                            проходить тренировку с таймерами.
                        </p>
                    )
                ) : (
                    <p className="program-structure-editor__hint">
                        В свободной схеме повторения и отдых описываются
                        текстом, как вам удобно, — без таймеров. Автоматическая
                        требует точных чисел, зато по ней можно проходить
                        тренировку с таймерами.
                    </p>
                )
            }

            <Textarea
                id={`scheme-description-${scheme.id}`}
                label="Описание (необязательно)"
                value={scheme.description ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, description: event.target.value })
                }
                rows={2}
            />

            <BlockListEditor
                blocks={scheme.blocks}
                isAuto={isAuto}
                onChange={(blocks) => onChange({ ...scheme, blocks })}
            />

            <Textarea
                id={`scheme-note-${scheme.id}`}
                label="Примечание (необязательно)"
                value={scheme.note ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, note: event.target.value })
                }
                rows={2}
            />

            <Input
                label="Дополнительные материалы (необязательно)"
                value={scheme.extraMaterials ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, extraMaterials: event.target.value })
                }
                placeholder="Например, ссылка на видео с пояснением"
            />
        </div>
    );
}

function SchemeItem({
    scheme,
    index,
    count,
    defaultCollapsed,
    onChange,
    onRemove,
    onMove,
}: {
    scheme: ProgramScheme;
    index: number;
    count: number;
    defaultCollapsed: boolean;
    onChange: (scheme: ProgramScheme) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className="program-structure-editor__scheme-wrapper">
            <div className="program-structure-editor__item-header">
                <CollapseToggle
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed((current) => !current)}
                    label="схему"
                />

                <span className="program-structure-editor__item-title">
                    Схема {index + 1}
                    {scheme.name && `: ${scheme.name}`}
                </span>

                <ReorderButtons index={index} count={count} onMove={onMove} />

                <button
                    type="button"
                    className="program-structure-editor__remove-button"
                    onClick={onRemove}
                >
                    Удалить схему
                </button>
            </div>

            {
                !isCollapsed && (
                    <SchemeEditor scheme={scheme} onChange={onChange} />
                )
            }
        </div>
    );
}

function SchemeListEditor({
    schemes,
    initialSchemeIds,
    onChange,
}: {
    schemes: ProgramScheme[];
    initialSchemeIds: Set<string>;
    onChange: (schemes: ProgramScheme[]) => void;
}) {
    function updateScheme(index: number, scheme: ProgramScheme) {
        onChange(schemes.map((item, i) => (i === index ? scheme : item)));
    }

    function removeScheme(index: number) {
        onChange(schemes.filter((_, i) => i !== index));
    }

    function moveScheme(index: number, direction: -1 | 1) {
        onChange(moveItem(schemes, index, direction));
    }

    function addScheme() {
        onChange([
            ...schemes,
            {
                id: generateLocalId("scheme"),
                name: "",
                blocks: [],
            },
        ]);
    }

    return (
        <div className="program-structure-editor__schemes">
            {
                schemes.map((scheme, index) => (
                    <SchemeItem
                        key={scheme.id}
                        scheme={scheme}
                        index={index}
                        count={schemes.length}
                        defaultCollapsed={initialSchemeIds.has(scheme.id ?? "")}
                        onChange={(updated) => updateScheme(index, updated)}
                        onRemove={() => removeScheme(index)}
                        onMove={(direction) => moveScheme(index, direction)}
                    />
                ))
            }

            <Button type="button" variant="outline" onClick={addScheme}>
                Добавить схему
            </Button>
        </div>
    );
}

// =====================================================================
// Структура целиком — разделы необязательны (п.10). Пока раздел один
// и без названия, он не показывается как отдельный уровень — только
// схемы напрямую; это внутреннее представление "без разделов", как
// описано в types/program.ts у ProgramSection.
// =====================================================================

function SectionItem({
    section,
    index,
    count,
    defaultCollapsed,
    initialSchemeIds,
    onChange,
    onRemove,
    onMove,
}: {
    section: ProgramSection;
    index: number;
    count: number;
    defaultCollapsed: boolean;
    initialSchemeIds: Set<string>;
    onChange: (section: ProgramSection) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className="program-structure-editor__section">
            <div className="program-structure-editor__item-header">
                <CollapseToggle
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed((current) => !current)}
                    label="раздел"
                />

                <Input
                    aria-label={`Название раздела ${index + 1}`}
                    value={section.name ?? ""}
                    onChange={(event) =>
                        onChange({ ...section, name: event.target.value })
                    }
                    placeholder="Например: Неделя 1"
                />

                <ReorderButtons index={index} count={count} onMove={onMove} />

                <button
                    type="button"
                    className="program-structure-editor__remove-button"
                    onClick={onRemove}
                >
                    Удалить раздел
                </button>
            </div>

            {
                !isCollapsed && (
                    <SchemeListEditor
                        schemes={section.schemes}
                        initialSchemeIds={initialSchemeIds}
                        onChange={(schemes) =>
                            onChange({ ...section, schemes })
                        }
                    />
                )
            }
        </div>
    );
}

type ProgramStructureEditorProps = {
    value: ProgramStructure;
    onChange: (value: ProgramStructure) => void;
};

export default function ProgramStructureEditor({
    value,
    onChange,
}: ProgramStructureEditorProps) {
    // Зафиксированный на момент первого рендера снимок id разделов и
    // схем — то, что уже было в структуре при открытии страницы,
    // должно открываться свёрнутым (см. UX-замечание: раскрытое сразу
    // всё сбивает ориентирование на длинных программах). Раздел или
    // схема, которых не было в этом снимке (только что добавлены
    // кнопкой "Добавить..."), наоборот, разворачиваются сразу — иначе
    // непонятно, куда делось только что созданное поле для ввода.
    const initialSectionIdsRef = useRef<Set<string>>(
        new Set(value.sections.map((section) => section.id ?? ""))
    );
    const initialSchemeIdsRef = useRef<Set<string>>(
        new Set(
            value.sections.flatMap((section) =>
                section.schemes.map((scheme) => scheme.id ?? "")
            )
        )
    );

    const sections =
        value.sections.length > 0
            ? value.sections
            : [{ id: generateLocalId("section"), schemes: [] }];

    const usesSections = sections.length > 1 || Boolean(sections[0]?.name);

    function updateSections(nextSections: ProgramSection[]) {
        onChange({ sections: nextSections });
    }

    function updateSection(index: number, section: ProgramSection) {
        updateSections(
            sections.map((item, i) => (i === index ? section : item))
        );
    }

    function enableSections() {
        // Даём первому (единственному) разделу имя по умолчанию — до
        // этого он был "безымянным" и представлял собой всю
        // программу целиком (см. комментарий выше).
        updateSections([
            { ...sections[0], name: sections[0].name || "Раздел 1" },
            { id: generateLocalId("section"), name: "Раздел 2", schemes: [] },
        ]);
    }

    function disableSections() {
        // Возможно только когда раздел остался ровно один — иначе
        // непонятно, в каком порядке объединять их схемы, и это
        // выглядело бы как случайная потеря структуры автора.
        updateSections([{ ...sections[0], name: undefined }]);
    }

    function removeSection(index: number) {
        const next = sections.filter((_, i) => i !== index);
        updateSections(next.length > 0 ? next : [
            { id: generateLocalId("section"), schemes: [] },
        ]);
    }

    function moveSection(index: number, direction: -1 | 1) {
        updateSections(moveItem(sections, index, direction));
    }

    function addSection() {
        updateSections([
            ...sections,
            {
                id: generateLocalId("section"),
                name: `Раздел ${sections.length + 1}`,
                schemes: [],
            },
        ]);
    }

    if (!usesSections) {
        return (
            <div className="program-structure-editor">
                <SchemeListEditor
                    schemes={sections[0].schemes}
                    initialSchemeIds={initialSchemeIdsRef.current}
                    onChange={(schemes) =>
                        updateSection(0, { ...sections[0], schemes })
                    }
                />

                <p className="program-structure-editor__hint">
                    Если программа рассчитана на несколько недель или циклов,
                    можно разбить её на разделы.
                </p>

                <Button type="button" variant="outline" onClick={enableSections}>
                    Разбить на разделы
                </Button>
            </div>
        );
    }

    return (
        <div className="program-structure-editor">
            {
                sections.map((section, index) => (
                    <SectionItem
                        key={section.id}
                        section={section}
                        index={index}
                        count={sections.length}
                        defaultCollapsed={initialSectionIdsRef.current.has(
                            section.id ?? ""
                        )}
                        initialSchemeIds={initialSchemeIdsRef.current}
                        onChange={(updated) => updateSection(index, updated)}
                        onRemove={() => removeSection(index)}
                        onMove={(direction) => moveSection(index, direction)}
                    />
                ))
            }

            <div className="program-structure-editor__section-actions">
                <Button type="button" variant="outline" onClick={addSection}>
                    Добавить раздел
                </Button>

                {
                    sections.length === 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={disableSections}
                        >
                            Убрать разделы
                        </Button>
                    )
                }
            </div>
        </div>
    );
}
