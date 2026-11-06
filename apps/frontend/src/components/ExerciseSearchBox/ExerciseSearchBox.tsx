import { useId, useMemo, useRef, useState } from "react";

import "../../styles/components/exercise-picker.css";

import { useExercises } from "../../context/ExerciseContext";

import { movementTypeLabels } from "../../constants/movementTypes";
import { matchesSearchQuery } from "../../utils/exerciseFilters";

import type { Exercise } from "../../types/exercise";

type ExerciseSearchBoxProps = {
    /** Упражнения, которые не предлагать (уже выбранные). По умолчанию — все предлагаются. */
    excludedIds?: string[];

    /** Выбор подсказки: клик мышью или Enter. */
    onSelect: (exercise: Exercise) => void;

    /** Подпись над полем. */
    label?: string;

    /** Для aria-invalid: у владельца поля есть ошибка валидации. */
    invalid?: boolean;

    /** Что написать в пустом списке подсказок, когда запрос пустой. */
    emptyText?: string;
};

const MAX_SUGGESTIONS = 50;

const NO_IDS: string[] = [];

/**
 * Поле поиска упражнений из базы с подсказками — общая часть выбора
 * упражнений комплекса (ExercisePicker) и блока программы
 * (ProgramBlockExercisesEditor): поиск по названию (русскому и
 * английскому), подсказки из ещё не выбранных упражнений.
 *
 * Поле — "combobox" со списком подсказок (ARIA): стрелки вверх/вниз
 * двигают выбор, Enter добавляет, Escape закрывает список. Мышью
 * подсказку выбирают по mousedown с preventDefault, чтобы поле не
 * теряло фокус раньше времени (иначе blur закрыл бы список до клика).
 */
export default function ExerciseSearchBox({
    excludedIds = NO_IDS,
    onSelect,
    label = "Добавить упражнение из базы упражнений",
    invalid = false,
    emptyText = "Все упражнения уже выбраны.",
}: ExerciseSearchBoxProps) {
    const { exercises, isLoading, loadError } = useExercises();

    const inputId = useId();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);

    // Подсказки: ещё не выбранные упражнения, подходящие под запрос.
    const suggestions = useMemo(
        () =>
            exercises
                .filter(
                    (exercise) =>
                        !excludedIds.includes(exercise.id) &&
                        matchesSearchQuery(exercise, query)
                )
                .slice(0, MAX_SUGGESTIONS),
        [exercises, excludedIds, query]
    );

    const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

    function add(exercise: Exercise) {
        onSelect(exercise);
        setQuery("");
        setHighlighted(0);
        // Список остаётся открытым: так можно сразу добавить следующее.
        setIsOpen(true);
        inputRef.current?.focus();
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
            // Enter в поле не должен отправлять форму.
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
        <>
            <label className="exercise-picker__add-label" htmlFor={inputId}>
                {label}
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
                    aria-invalid={invalid ? true : undefined}
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
                                                        : emptyText)
                                        }
                                    </li>
                                )
                            }
                        </ul>
                    )
                }
            </div>
        </>
    );
}
