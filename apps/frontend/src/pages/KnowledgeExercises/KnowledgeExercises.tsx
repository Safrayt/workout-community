import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Input from "../../components/ui/Input/Input";
import MuscleMap from "../../components/MuscleMap/MuscleMap";
import MuscleMapLegend, {
    type MuscleMapLegendItem,
} from "../../components/MuscleMapLegend/MuscleMapLegend";
import ExerciseFilters from "../../components/ExerciseFilters/ExerciseFilters";
import ExerciseCard from "../../components/ExerciseCard/ExerciseCard";
import ExercisesPlaygroundMap from "../../components/ExercisesPlaygroundMap/ExercisesPlaygroundMap";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch";

import "../../styles/components/knowledge-exercises.css";

import type { MuscleGroupKey } from "../../types/exercise";

import { useIsAdmin } from "../../context/CurrentUserContext";
import { useExercises } from "../../context/ExerciseContext";
import { usePlaygrounds } from "../../context/PlaygroundContext";

import {
    MAX_EXERCISE_QUERY_LENGTH,
    countActiveExerciseFilters,
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
 * мышечных групп, поиск по названию, фильтры и список упражнений.
 *
 * - Клик по мышце на карте (или кнопке мышцы в фильтрах) добавляет её
 *   в фильтр; несколько мышц объединяются по "И".
 * - Клик по карточке упражнения подсвечивает на карте его мышцы:
 *   целевые красным, вспомогательные оранжевым.
 * - Поиск по названию — над списком; сочетается с фильтрами по "И".
 * - Панель фильтров (типы движения и мышцы) можно скрыть кнопкой рядом
 *   с поиском, чтобы список был ближе. Поиск виден всегда; сколько
 *   фильтров выбрано, показывает сама кнопка.
 * - Над картой переключатель «Карта мышц / Карта площадок». Клик по
 *   метке площадки оставляет упражнения, которые можно выполнить на её
 *   оборудовании (выбранная площадка и кнопка «Снять выбор» — в блоке
 *   «Площадка» панели фильтров); страница площадки открывает эту
 *   страницу ссылкой ?playground=<id>.
 * - Фильтры и поиск хранятся в адресе страницы
 *   (?movement=…&muscles=…&playground=…&q=…): они переживают переход на
 *   страницу упражнения и возврат назад.
 */
export default function KnowledgeExercises() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Страница открыта и гостям — они просто не админы.
    const isAdmin = useIsAdmin();
    const { exercises, isLoading, loadError, reload } = useExercises();
    const { playgrounds, isLoading: arePlaygroundsLoading } = usePlaygrounds();

    const urlFilters = useMemo(
        () => parseExerciseFilters(searchParams),
        [searchParams]
    );

    // Строку поиска держим в собственном состоянии, а не читаем прямо из
    // адреса: поле ввода должно отзываться на каждую букву мгновенно, а
    // обновление адреса (через роутер) может запаздывать и "съедать"
    // символы. Список фильтруется по этому состоянию; в адрес оно
    // переносится с небольшой задержкой (см. эффект ниже).
    const [searchText, setSearchText] = useState(urlFilters.query);

    const filters = useMemo(
        () => ({ ...urlFilters, query: searchText }),
        [urlFilters, searchText]
    );

    const [areFiltersVisible, setAreFiltersVisible] = useState(true);

    // Если страницу открыли ссылкой с выбранной площадкой, сразу
    // показываем карту площадок: фильтр живёт на ней.
    const [mapView, setMapView] = useState<"muscles" | "playgrounds">(
        urlFilters.playgroundId !== "" ? "playgrounds" : "muscles"
    );

    useEffect(() => {
        if (searchText === urlFilters.query) {
            return;
        }

        const timer = setTimeout(() => {
            // Функциональная форма: берём самый свежий адрес, а не тот,
            // что был при вводе, — иначе поиск затёр бы тип движения или
            // мышцы, выбранные за эти доли секунды.
            setSearchParams(
                (current) =>
                    writeExerciseFilters(current, {
                        ...parseExerciseFilters(current),
                        query: searchText,
                    }),
                { replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchText, urlFilters.query, setSearchParams]);

    const hasQuery = searchText.trim() !== "";
    const activeFiltersCount = countActiveExerciseFilters(filters);

    const [selectedExerciseId, setSelectedExerciseId] =
        useState<string | null>(null);

    const selectedPlayground = useMemo(
        () =>
            playgrounds.find(
                (playground) => playground.id === filters.playgroundId
            ),
        [playgrounds, filters.playgroundId]
    );

    // Площадка выбрана в адресе, но список площадок ещё грузится:
    // пока неизвестно её оборудование, список упражнений не показываем,
    // чтобы он не мигнул полным и не сузился.
    const isPlaygroundPending =
        filters.playgroundId !== "" && arePlaygroundsLoading;

    // Площадка есть в адресе, но такой нет (удалена, опечатка в ссылке).
    const isPlaygroundMissing =
        filters.playgroundId !== "" &&
        !arePlaygroundsLoading &&
        !selectedPlayground;

    const filteredExercises = useMemo(
        () =>
            filterExercises(exercises, filters, selectedPlayground?.equipment),
        [exercises, filters, selectedPlayground]
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

    // Повторный клик по выбранной площадке снимает выбор. Выбранная
    // площадка показана в панели фильтров, поэтому при выборе
    // раскрываем панель, если она была скрыта.
    function handleSelectPlayground(playgroundId: string) {
        const isSelecting = playgroundId !== filters.playgroundId;

        if (isSelecting) {
            setAreFiltersVisible(true);
        }

        handleFiltersChange({
            ...filters,
            playgroundId: isSelecting ? playgroundId : "",
        });
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

    function handleResetAll() {
        setSelectedExerciseId(null);
        setSearchText("");
        updateFilters(emptyExerciseFilters);
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
                isAdmin && (
                    <div className="exercises-toolbar">
                        <Link to="/knowledge/exercises/create">
                            <Button type="button" variant="primary">
                                Добавить упражнение
                            </Button>
                        </Link>
                    </div>
                )
            }

            <h3>{mapView === "muscles" ? "Карта мышц" : "Карта площадок"}</h3>

            <div className="exercises-map-switch">
                <ViewSwitch
                    ariaLabel="Какую карту показывать"
                    options={[
                        { value: "muscles", label: "Карта мышц" },
                        { value: "playgrounds", label: "Карта площадок" },
                    ]}
                    value={mapView}
                    onChange={setMapView}
                />
            </div>

            <p className="exercises-hint">
                {
                    mapView === "muscles"
                        ? "Нажмите на мышцу, чтобы найти упражнения, которые её нагружают. Нажмите на упражнение в списке — на карте подсветятся его мышцы."
                        : "Нажмите на площадку, чтобы увидеть упражнения, которые можно выполнить на её оборудовании. Повторный клик снимает выбор."
                }
            </p>

            <div className="exercises-map">
                {
                    mapView === "muscles" ? (
                        <>
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
                        </>
                    ) : arePlaygroundsLoading ? (
                        <p className="exercises-status">Загрузка площадок…</p>
                    ) : (
                        <ExercisesPlaygroundMap
                            playgrounds={playgrounds}
                            selectedPlaygroundId={filters.playgroundId}
                            onSelectPlayground={handleSelectPlayground}
                        />
                    )
                }
            </div>

            <hr />

            <h3>Поиск и фильтры</h3>

            <div className="exercises-search">
                <div className="exercises-search__field">
                    <Input
                        id="exercise-search"
                        type="search"
                        aria-label="Поиск упражнения по названию"
                        placeholder="Поиск по названию…"
                        autoComplete="off"
                        maxLength={MAX_EXERCISE_QUERY_LENGTH}
                        className="exercises-search__input"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setSearchText("");
                            }
                        }}
                    />

                    {
                        searchText !== "" && (
                            <button
                                type="button"
                                className="exercises-search__clear"
                                aria-label="Очистить поиск"
                                onClick={() => setSearchText("")}
                            >
                                ×
                            </button>
                        )
                    }
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="exercises-search__toggle"
                    aria-expanded={areFiltersVisible}
                    aria-controls="exercise-filters-panel"
                    onClick={() => setAreFiltersVisible((visible) => !visible)}
                >
                    {
                        areFiltersVisible
                            ? "Скрыть фильтры"
                            : `Показать фильтры${
                                activeFiltersCount > 0
                                    ? ` (${activeFiltersCount})`
                                    : ""
                            }`
                    }
                </Button>
            </div>

            {/* hidden, а не размонтирование: у панели нет своего
                состояния, а id нужен для aria-controls у кнопки. */}
            <div id="exercise-filters-panel" hidden={!areFiltersVisible}>
                <ExerciseFilters
                    filters={filters}
                    onChange={handleFiltersChange}
                    selectedPlayground={selectedPlayground}
                    isPlaygroundMissing={isPlaygroundMissing}
                />
            </div>

            <hr />

            {
                isLoading || isPlaygroundPending ? (
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
                            {
                                hasQuery
                                    ? "Нет упражнений с таким названием среди выбранных фильтров. Проверьте запрос или уберите часть фильтров."
                                    : selectedPlayground
                                        ? "Нет упражнений, которые подходят сразу под все выбранные параметры и оборудование этой площадки. Попробуйте убрать часть мышц, сменить тип движения или выбрать другую площадку."
                                        : "Нет упражнений, которые подходят сразу под все выбранные параметры. Попробуйте убрать часть мышц или сменить тип движения."
                            }
                        </p>

                        <Button variant="outline" onClick={handleResetAll}>
                            {hasQuery ? "Сбросить поиск и фильтры" : "Сбросить фильтры"}
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
