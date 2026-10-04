import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import MuscleMap from "../../components/MuscleMap/MuscleMap";
import MuscleMapLegend, {
    type MuscleMapLegendItem,
} from "../../components/MuscleMapLegend/MuscleMapLegend";
import ExerciseFilters from "../../components/ExerciseFilters/ExerciseFilters";
import ExerciseCard from "../../components/ExerciseCard/ExerciseCard";

import "../../styles/components/knowledge-exercises.css";

import type { MuscleGroupKey } from "../../types/exercise";

import { useCurrentUser } from "../../context/CurrentUserContext";
import { useExercises } from "../../context/ExerciseContext";

import {
    emptyExerciseFilters,
    filterExercises,
    parseExerciseFilters,
    toggleItem,
    writeExerciseFilters,
    type ExerciseFilterState,
} from "../../utils/exerciseFilters";
import { pluralizeRu } from "../../utils/pluralize";

/**
 * /knowledge/exercises — база упражнений с собственным весом: карта
 * мышечных групп, фильтры и список упражнений.
 *
 * - Клик по мышце на карте (или кнопке мышцы в фильтрах) добавляет её
 *   в фильтр; несколько мышц объединяются по "И".
 * - Клик по карточке упражнения подсвечивает на карте его мышцы:
 *   целевые красным, вспомогательные оранжевым.
 * - Фильтры хранятся в адресе страницы (?movement=…&muscles=…): они
 *   переживают переход на страницу упражнения и возврат назад.
 */
export default function KnowledgeExercises() {
    const [searchParams, setSearchParams] = useSearchParams();

    const { currentUser } = useCurrentUser();
    const { exercises, isLoading, loadError, reload } = useExercises();

    const filters = useMemo(
        () => parseExerciseFilters(searchParams),
        [searchParams]
    );

    const [selectedExerciseId, setSelectedExerciseId] =
        useState<string | null>(null);

    const filteredExercises = useMemo(
        () => filterExercises(exercises, filters),
        [exercises, filters]
    );

    // Выбранное упражнение учитываем только пока оно есть в списке: если
    // фильтры его скрыли, подсветка на карте тоже пропадает, а не
    // относится к карточке, которой на экране уже нет.
    const selectedExercise = filteredExercises.find(
        (exercise) => exercise.id === selectedExerciseId
    );

    function updateFilters(next: ExerciseFilterState) {
        // replace: каждое нажатие на фильтр не должно засорять историю
        // браузера — "Назад" должен уводить со страницы, а не
        // перебирать выбранные мышцы.
        setSearchParams(writeExerciseFilters(searchParams, next), {
            replace: true,
        });
    }

    function handleFiltersChange(next: ExerciseFilterState) {
        // Когда меняется выбор мышц, режим просмотра упражнения
        // закрываем: иначе заливка упражнения закрывала бы на карте
        // результат выбора.
        const musclesChanged =
            next.muscles.length !== filters.muscles.length ||
            next.muscles.some((muscle) => !filters.muscles.includes(muscle));

        if (musclesChanged) {
            setSelectedExerciseId(null);
        }

        updateFilters(next);
    }

    function handleToggleMuscle(muscle: MuscleGroupKey) {
        handleFiltersChange({
            ...filters,
            muscles: toggleItem(filters.muscles, muscle),
        });
    }

    // Повторный клик по выбранному упражнению снимает выбор. Страницу
    // при этом не прокручиваем: человек остаётся там, где был, а мышцы
    // упражнения видны на карте выше и в режиме "Мышцы" на самой карточке.
    function handleSelectExercise(exerciseId: string) {
        setSelectedExerciseId(
            exerciseId === selectedExercise?.id ? null : exerciseId
        );
    }

    const legendItems: MuscleMapLegendItem[] = [];

    if (selectedExercise) {
        legendItems.push("target", "auxiliary");
    }

    if (filters.muscles.length > 0) {
        legendItems.push("selected");
    }

    return (
        <Section title="Упражнения">
            {
                // Добавлять упражнения может только администратор; сервер
                // проверяет это сам (ensure_admin), здесь кнопку просто не
                // показываем остальным.
                currentUser.isAdmin && (
                    <div className="exercises-toolbar">
                        <Link to="/knowledge/exercises/create">
                            <Button type="button" variant="primary">
                                Добавить упражнение
                            </Button>
                        </Link>
                    </div>
                )
            }

            <h3>Карта мышц</h3>

            <p className="exercises-hint">
                Нажмите на мышцу, чтобы найти упражнения, которые её нагружают.
                Нажмите на упражнение в списке — на карте подсветятся его мышцы.
            </p>

            <div className="exercises-map">
                <div className="exercises-map__figure">
                    <MuscleMap
                        selectedMuscles={filters.muscles}
                        targetMuscles={selectedExercise?.targetMuscles}
                        auxiliaryMuscles={selectedExercise?.auxiliaryMuscles}
                        onToggleMuscle={handleToggleMuscle}
                    />
                </div>

                <MuscleMapLegend items={legendItems} />

                {
                    selectedExercise && (
                        <div className="exercises-map__selected" role="status">
                            <span>
                                Показаны мышцы упражнения{" "}
                                <strong>{selectedExercise.name}</strong>
                            </span>

                            <Button
                                variant="outline"
                                onClick={() => setSelectedExerciseId(null)}
                            >
                                Снять выбор
                            </Button>
                        </div>
                    )
                }
            </div>

            <hr />

            <h3>Фильтры</h3>

            <ExerciseFilters
                filters={filters}
                onChange={handleFiltersChange}
            />

            <hr />

            {
                isLoading ? (
                    <p className="exercises-status">Загрузка упражнений…</p>
                ) : loadError ? (
                    <div className="exercises-empty-state">
                        <p className="exercises-empty-state__title">
                            {loadError}
                        </p>

                        <Button variant="outline" onClick={() => void reload()}>
                            Повторить
                        </Button>
                    </div>
                ) : filteredExercises.length === 0 ? (
                    <div className="exercises-empty-state">
                        <p className="exercises-empty-state__title">
                            Ничего не найдено
                        </p>

                        <p className="exercises-empty-state__description">
                            Нет упражнений, которые подходят сразу под все
                            выбранные параметры. Попробуйте убрать часть мышц
                            или сменить тип движения.
                        </p>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedExerciseId(null);
                                updateFilters(emptyExerciseFilters);
                            }}
                        >
                            Сбросить фильтры
                        </Button>
                    </div>
                ) : (
                    <>
                        <p className="exercises-count">
                            {
                                `Найдено: ${filteredExercises.length} ${
                                    pluralizeRu(
                                        filteredExercises.length,
                                        ["упражнение", "упражнения", "упражнений"]
                                    )
                                }`
                            }
                        </p>

                        <div className="exercises-list">
                            {
                                filteredExercises.map((exercise) => (
                                    <ExerciseCard
                                        key={exercise.id}
                                        exercise={exercise}
                                        selected={exercise.id === selectedExercise?.id}
                                        onSelect={() => handleSelectExercise(exercise.id)}
                                    />
                                ))
                            }
                        </div>
                    </>
                )
            }
        </Section>
    );
}
