import { useId, useMemo, useRef, useState } from "react";

import "../../styles/components/exercise-picker.css";

import { useExercises } from "../../context/ExerciseContext";

import { muscleGroupLabels } from "../../constants/muscleGroups";
import { movementTypeLabels } from "../../constants/movementTypes";
import { matchesSearchQuery } from "../../utils/exerciseFilters";
import { getComplexMuscles } from "../../utils/complexMuscles";

import type { Exercise } from "../../types/exercise";

type ExercisePickerProps = {
    /** Id выбранных упражнений в порядке схемы. */
    value: string[];

    onChange: (ids: string[]) => void;

    /** Сообщение валидации — показывается под списком. */
    error?: string;

    /**
     * Прежний текст "Упражнение(я)" у комплекса, заведённого до связи с
     * базой упражнений: подсказка, из чего выбирать (показывается, пока
     * ничего не выбрано).
     */
    legacyText?: string;
};

const MAX_SUGGESTIONS = 50;

/**
 * Выбор упражнений комплекса из базы упражнений: поле с поиском по
 * названию (русскому и английскому) и подсказками, ниже — выбранные
 * упражнения по порядку схемы, которые можно переставлять и убирать, и
 * общая мышечная группа выбранного.
 *
 * Поле — "combobox" со списком подсказок (ARIA): стрелки вверх/вниз
 * двигают выбор, Enter добавляет, Escape закрывает список. Мышью
 * подсказку выбирают по mousedown с preventDefault, чтобы поле не
 * теряло фокус раньше времени (иначе blur закрыл бы список до клика).
 */
export default function ExercisePicker({
    value,
    onChange,
    error,
    legacyText,
}: ExercisePickerProps) {
    const { exercises, isLoading, loadError } = useExercises();

    const inputId = useId();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);

    const byId = useMemo(
        () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
        [exercises]
    );

    // Подсказки: ещё не выбранные упражнения, подходящие под запрос.
    const suggestions = useMemo(
        () =>
            exercises
                .filter(
                    (exercise) =>
                        !value.includes(exercise.id) &&
                        matchesSearchQuery(exercise, query)
                )
                .slice(0, MAX_SUGGESTIONS),
        [exercises, value, query]
    );

    const selected = value.map((id) => ({ id, exercise: byId.get(id) }));

    const muscles = useMemo(
        () =>
            getComplexMuscles(
                value
                    .map((id) => byId.get(id))
                    .filter((exercise): exercise is Exercise => exercise !== undefined)
            ),
        [value, byId]
    );

    const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

    function add(exercise: Exercise) {
        onChange([...value, exercise.id]);
        setQuery("");
        setHighlighted(0);
        // Список остаётся открытым: так можно сразу добавить следующее.
        setIsOpen(true);
        inputRef.current?.focus();
    }

    function remove(id: string) {
        onChange(value.filter((item) => item !== id));
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;

        if (target < 0 || target >= value.length) {
            return;
        }

        const next = [...value];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setHighlighted(Math.min(activeIndex + 1, suggestions.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted(Math.max(activeIndex - 1, 0));
        } else if (event.key === "Enter") {
            // Enter в поле не должен отправлять форму комплекса.
            event.preventDefault();

            if (isOpen && suggestions[activeIndex]) {
                add(suggestions[activeIndex]);
            }
        } else if (event.key === "Escape") {
            if (isOpen) {
                event.preventDefault();
                setIsOpen(false);
            }
        }
    }

    const activeOptionId =
        isOpen && suggestions[activeIndex]
            ? `${listId}-option-${suggestions[activeIndex].id}`
            : undefined;

    return (
        <div className="exercise-picker">
            <p className="exercise-picker__label">Упражнения комплекса</p>

            {
                selected.length === 0 && legacyText && (
                    <p className="exercise-picker__legacy">
                        Раньше здесь было записано текстом:{" "}
                        <em>{legacyText}</em>. Выберите соответствующие
                        упражнения из базы.
                    </p>
                )
            }

            {
                selected.length > 0 && (
                    <ol className="exercise-picker__selected">
                        {
                            selected.map(({ id, exercise }, index) => {
                                const title = exercise?.name ?? `Не найдено: ${id}`;

                                return (
                                    <li
                                        key={id}
                                        className={
                                            exercise
                                                ? "exercise-picker__item"
                                                : "exercise-picker__item exercise-picker__item--missing"
                                        }
                                    >
                                        <span className="exercise-picker__item-name">
                                            {title}
                                        </span>

                                        <span className="exercise-picker__item-actions">
                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button"
                                                aria-label={`Поднять выше: ${title}`}
                                                disabled={index === 0}
                                                onClick={() => move(index, -1)}
                                            >
                                                ↑
                                            </button>

                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button"
                                                aria-label={`Опустить ниже: ${title}`}
                                                disabled={index === selected.length - 1}
                                                onClick={() => move(index, 1)}
                                            >
                                                ↓
                                            </button>

                                            <button
                                                type="button"
                                                className="exercise-picker__icon-button exercise-picker__icon-button--remove"
                                                aria-label={`Убрать из комплекса: ${title}`}
                                                onClick={() => remove(id)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    </li>
                                );
                            })
                        }
                    </ol>
                )
            }

            {
                selected.length === 0 && (
                    <p className="exercise-picker__hint">
                        Пока не выбрано ни одного упражнения.
                    </p>
                )
            }

            <label className="exercise-picker__add-label" htmlFor={inputId}>
                Добавить упражнение из базы упражнений
            </label>

            <div className="exercise-picker__search">
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    role="combobox"
                    className="exercise-picker__input"
                    placeholder="Начните вводить название упражнения…"
                    autoComplete="off"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeOptionId}
                    aria-invalid={error ? true : undefined}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setHighlighted(0);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={handleKeyDown}
                />

                {
                    isOpen && (
                        <ul
                            id={listId}
                            role="listbox"
                            className="exercise-picker__suggestions"
                        >
                            {
                                suggestions.map((exercise, index) => (
                                    <li
                                        key={exercise.id}
                                        id={`${listId}-option-${exercise.id}`}
                                        role="option"
                                        aria-selected={index === activeIndex}
                                        className={
                                            index === activeIndex
                                                ? "exercise-picker__option exercise-picker__option--active"
                                                : "exercise-picker__option"
                                        }
                                        onMouseEnter={() => setHighlighted(index)}
                                        onMouseDown={(event) => {
                                            // Не даём полю потерять фокус (см. выше).
                                            event.preventDefault();
                                            add(exercise);
                                        }}
                                    >
                                        <span className="exercise-picker__option-name">
                                            {exercise.name}
                                        </span>

                                        <span className="exercise-picker__option-meta">
                                            {movementTypeLabels[exercise.movementType]}
                                        </span>
                                    </li>
                                ))
                            }

                            {
                                suggestions.length === 0 && (
                                    <li
                                        className="exercise-picker__empty"
                                        role="presentation"
                                    >
                                        {
                                            isLoading
                                                ? "Загружаем упражнения…"
                                                : loadError
                                                    ?? (query.trim() !== ""
                                                        ? "Такого упражнения нет в базе."
                                                        : "Все упражнения уже выбраны.")
                                        }
                                    </li>
                                )
                            }
                        </ul>
                    )
                }
            </div>

            <p className="exercise-picker__hint">
                Добавляйте упражнения в том порядке, в каком они идут в схеме:
                порядок можно поменять стрелками. Нужного нет в списке — сначала
                добавьте его в базу упражнений.
            </p>

            {
                (muscles.target.length > 0 || muscles.auxiliary.length > 0) && (
                    <div className="exercise-picker__muscles">
                        <p>
                            <strong>Целевые мышцы комплекса:</strong>{" "}
                            {muscles.target.map((key) => muscleGroupLabels[key]).join(", ") || "—"}
                        </p>

                        {
                            muscles.auxiliary.length > 0 && (
                                <p>
                                    <strong>Вспомогательные:</strong>{" "}
                                    {muscles.auxiliary.map((key) => muscleGroupLabels[key]).join(", ")}
                                </p>
                            )
                        }
                    </div>
                )
            }

            {
                error && (
                    <small className="exercise-picker__error" role="alert">
                        {error}
                    </small>
                )
            }
        </div>
    );
}
