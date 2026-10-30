import { useId, useMemo, useRef, useState } from "react";

import "../../styles/components/exercise-search-input.css";

import { useExercises } from "../../context/ExerciseContext";

import { movementTypeLabels } from "../../constants/movementTypes";
import { matchesSearchQuery } from "../../utils/exerciseFilters";

import type { Exercise } from "../../types/exercise";

type ExerciseSearchInputProps = {
    /** Подпись над полем. */
    label: string;

    /** Вызывается при выборе упражнения; поле после этого очищается. */
    onSelect: (exercise: Exercise) => void;

    placeholder?: string;
};

const MAX_SUGGESTIONS = 50;

/**
 * Поле поиска упражнения в базе упражнений (по русскому и английскому
 * названию) с подсказками. Выбор не ограничен уже выбранными: одно и то
 * же упражнение можно добавлять в схему сколько угодно раз.
 *
 * Поле — "combobox" со списком подсказок (ARIA): стрелки вверх/вниз
 * двигают выбор, Enter добавляет, Escape закрывает список. Мышью
 * подсказку выбирают по mousedown с preventDefault, чтобы поле не
 * теряло фокус раньше времени (иначе blur закрыл бы список до клика).
 */
export default function ExerciseSearchInput({
    label,
    onSelect,
    placeholder = "Начните вводить название упражнения…",
}: ExerciseSearchInputProps) {
    const { exercises, isLoading, loadError } = useExercises();

    const inputId = useId();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);

    const suggestions = useMemo(
        () =>
            exercises
                .filter((exercise) => matchesSearchQuery(exercise, query))
                .slice(0, MAX_SUGGESTIONS),
        [exercises, query]
    );

    const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

    function select(exercise: Exercise) {
        onSelect(exercise);
        setQuery("");
        setHighlighted(0);
        // Список закрываем: поле стоит в конце блока, и открытый список
        // перекрывал бы кнопки ниже ("+ Добавить блок", следующий блок) —
        // человек, потянувшись к ним, попал бы по подсказке и добавил
        // лишнее упражнение. Следующее добавляется так же быстро: фокус
        // остаётся в поле, а ввод буквы, стрелка вниз или клик открывают
        // список снова.
        setIsOpen(false);
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
            // Enter в поле не должен отправлять форму комплекса.
            event.preventDefault();

            if (isOpen && suggestions[activeIndex]) {
                select(suggestions[activeIndex]);
            }
        } else if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setIsOpen(false);
        }
    }

    const activeOptionId =
        isOpen && suggestions[activeIndex]
            ? `${listId}-option-${suggestions[activeIndex].id}`
            : undefined;

    return (
        <div className="exercise-search">
            <label className="exercise-search__label" htmlFor={inputId}>
                {label}
            </label>

            <div className="exercise-search__field">
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    role="combobox"
                    className="exercise-search__input"
                    placeholder={placeholder}
                    autoComplete="off"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeOptionId}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setHighlighted(0);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={handleKeyDown}
                />

                {
                    isOpen && (
                        <ul id={listId} role="listbox" className="exercise-search__suggestions">
                            {
                                suggestions.map((exercise, index) => (
                                    <li
                                        key={exercise.id}
                                        id={`${listId}-option-${exercise.id}`}
                                        role="option"
                                        aria-selected={index === activeIndex}
                                        className={
                                            index === activeIndex
                                                ? "exercise-search__option exercise-search__option--active"
                                                : "exercise-search__option"
                                        }
                                        onMouseEnter={() => setHighlighted(index)}
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            select(exercise);
                                        }}
                                    >
                                        <span>{exercise.name}</span>

                                        <span className="exercise-search__option-meta">
                                            {movementTypeLabels[exercise.movementType]}
                                        </span>
                                    </li>
                                ))
                            }

                            {
                                suggestions.length === 0 && (
                                    <li className="exercise-search__empty" role="presentation">
                                        {
                                            isLoading
                                                ? "Загружаем упражнения…"
                                                : loadError ?? "Такого упражнения нет в базе."
                                        }
                                    </li>
                                )
                            }
                        </ul>
                    )
                }
            </div>
        </div>
    );
}
