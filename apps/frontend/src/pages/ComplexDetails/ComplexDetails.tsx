import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { makeDescription } from "../../utils/pageMeta";

import ComplexScheme from "../../components/ComplexScheme/ComplexScheme";
import ComplexSchemeView from "../../components/ComplexSchemeView/ComplexSchemeView";
import ComplexLeaderboard from "../../components/ComplexLeaderboard/ComplexLeaderboard";
import ComplexBestResult from "../../components/ComplexBestResult/ComplexBestResult";
import ComplexCompletionHistory from "../../components/ComplexCompletionHistory/ComplexCompletionHistory";
import ComplexCompletionForm from "../../components/ComplexCompletionForm/ComplexCompletionForm";
import ComplexComments from "../../components/ComplexComments/ComplexComments";
import MuscleMap from "../../components/MuscleMap/MuscleMap";
import MuscleMapLegend from "../../components/MuscleMapLegend/MuscleMapLegend";
import Badge from "../../components/ui/Badge/Badge";

import "../../styles/components/complex-details.css";

import type { Complex } from "../../types/complex";
import type { Exercise } from "../../types/exercise";
import type { ComplexCompletion } from "../../types/complexCompletion";
import type { NewComplexCompletion } from "../../types/newComplexCompletion";

import { useComplexes } from "../../context/ComplexContext";
import { useExercises } from "../../context/ExerciseContext";
import { useWorkoutDiary } from "../../context/WorkoutDiaryContext";
import { useAuth, useCurrentUser } from "../../context/CurrentUserContext";

import { complexTypeLabels } from "../../constants/complexTypes";
import { movementTypeColors, movementTypeLabels } from "../../constants/movementTypes";
import { muscleGroupLabels } from "../../constants/muscleGroups";
import { findBestCompletion } from "../../utils/complexResult";
import { getComplexMuscles } from "../../utils/complexMuscles";

type PanelState =
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; completion: ComplexCompletion }
    | { mode: "history" };

type CompletionFormSectionProps = {
    complexDef: Complex;
    panel: Extract<PanelState, { mode: "create" } | { mode: "edit" }>;
    onSubmit: (data: NewComplexCompletion) => Promise<void>;
    onCancel: () => void;
};

/**
 * Форма "Отметить выполнение" / "Редактировать выполнение".
 *
 * Вынесена из ComplexDetails, потому что ей нужен дневник
 * (useWorkoutDiary — записи, к которым можно привязать выполнение),
 * а страница комплекса открыта и гостям. Форма показывается только
 * вошедшему, так что дневник загружается только ему: гостю общая
 * лента дневников на этой странице не нужна.
 */
function CompletionFormSection({
    complexDef,
    panel,
    onSubmit,
    onCancel,
}: CompletionFormSectionProps) {
    const { entries } = useWorkoutDiary();
    const { currentUser } = useCurrentUser();

    const ownEntries = entries.filter((entry) => entry.userId === currentUser.id);

    return (
        <section className="complex-details__section complex-details__form-section">
            <ComplexCompletionForm
                complexDef={complexDef}
                diaryEntries={ownEntries}
                initialValue={
                    panel.mode === "edit"
                        ? {
                              resultTimeSeconds: panel.completion.resultTimeSeconds,
                              resultReps: panel.completion.resultReps,
                              resultSets: panel.completion.resultSets,
                              resultRounds: panel.completion.resultRounds,
                              resultDurationSeconds:
                                  panel.completion.resultDurationSeconds,
                              resultCount: panel.completion.resultCount,
                              diaryEntryId: panel.completion.diaryEntryId,
                              completedDate: panel.completion.completedDate,
                          }
                        : undefined
                }
                submitLabel={
                    panel.mode === "edit"
                        ? "Сохранить изменения"
                        : "Подтвердить выполнение"
                }
                onSubmit={onSubmit}
                onCancel={onCancel}
            />
        </section>
    );
}

export default function ComplexDetails() {
    const { id } = useParams();

    const {
        getComplexById,
        isLoading,
        completionsByComplex,
        loadCompletions,
        addCompletion,
        editCompletion,
        removeCompletion,
    } = useComplexes();

    const { getExerciseById } = useExercises();

    // Страницу комплекса видят и гости: у них нет ни истории
    // выполнений, ни "лучшего результата" — это личное.
    const { user } = useAuth();
    const location = useLocation();

    const [panel, setPanel] = useState<PanelState>({ mode: "closed" });

    const complexDef = id ? getComplexById(id) : undefined;
    const completions = id ? completionsByComplex[id] ?? [] : [];

    useEffect(() => {
        // История выполнений личная (GET /complexes/{id}/completions
        // только для вошедшего) — гостю не запрашиваем.
        if (id && user) {
            loadCompletions(id).catch((error: unknown) => {
                console.error("Не удалось загрузить историю выполнений:", error);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id]);

    // Заголовок вкладки и описание для поиска — по самому комплексу.
    usePageMeta(
        complexDef?.name,
        complexDef
            ? makeDescription(complexDef.description) ||
                  `Комплекс упражнений «${complexDef.name}» для уличной тренировки.`
            : undefined
    );

    if (isLoading) {
        return <p className="complex-details__loading">Загрузка…</p>;
    }

    if (!complexDef) {
        return (
            <div className="complex-details__not-found">
                <p>Комплекс не найден.</p>
                <Link to="/complexes">← Ко всем комплексам</Link>
            </div>
        );
    }

    const best = findBestCompletion(complexDef, completions);

    async function handleCreate(data: NewComplexCompletion) {
        await addCompletion(complexDef!.id, data);
        setPanel({ mode: "closed" });
    }

    async function handleEdit(data: NewComplexCompletion) {
        if (panel.mode !== "edit") return;

        await editCompletion(panel.completion.id, complexDef!.id, data);
        setPanel({ mode: "closed" });
    }

    async function handleDelete(completion: ComplexCompletion) {
        const confirmed = window.confirm(
            "Удалить это выполнение? Запись дневника при этом не удаляется."
        );

        if (!confirmed) return;

        try {
            await removeCompletion(completion.id, complexDef!.id);
        } catch (error: unknown) {
            console.error("Не удалось удалить выполнение:", error);
            window.alert("Не удалось удалить выполнение. Попробуйте ещё раз.");
        }
    }

    // Упражнения комплекса из базы упражнений. Ссылки и мышцы строим,
    // только когда нашлись ВСЕ — пока список упражнений ещё грузится
    // (или какого-то уже нет), показываем текст от сервера, чтобы не
    // выводить комплекс "из половины упражнений" и общую мышечную
    // группу по неполным данным.
    const linkedExercises = complexDef.exerciseIds.map((id) => getExerciseById(id));
    const exercisesAreLinked =
        complexDef.exerciseIds.length > 0 &&
        linkedExercises.every((exercise) => exercise !== undefined);
    const exercisesList = exercisesAreLinked ? (linkedExercises as Exercise[]) : [];
    const muscles = getComplexMuscles(exercisesList);

    return (
        <div className="complex-details">
            <Link to="/complexes" className="complex-details__back">
                ← Комплексы
            </Link>

            <div className="complex-details__header">
                <div className="complex-details__title-row">
                    <h1 className="complex-details__name">{complexDef.name}</h1>

                    {
                        user?.isAdmin && (
                            <Link
                                to={`/complexes/${complexDef.id}/edit`}
                                className="complex-details__edit-link"
                            >
                                Редактировать
                            </Link>
                        )
                    }
                </div>

                {
                    // Теги — отдельной строкой под названием, чтобы длинное
                    // название и теги не толкали друг друга.
                    (complexDef.types.length > 0 || complexDef.movements.length > 0) && (
                        <div className="complex-details__tags">
                            {
                                complexDef.types.map((type) => (
                                    <Badge key={type} variant="primary">
                                        {complexTypeLabels[type]}
                                    </Badge>
                                ))
                            }

                            {
                                complexDef.movements.map((movement) => (
                                    <span
                                        key={movement}
                                        className="complex-details__movements-chip"
                                        style={
                                            {
                                                "--chip-color": movementTypeColors[movement],
                                            } as React.CSSProperties
                                        }
                                    >
                                        <span
                                            className="complex-details__movements-dot"
                                            aria-hidden="true"
                                        />

                                        {movementTypeLabels[movement]}
                                    </span>
                                ))
                            }
                        </div>
                    )
                }
            </div>

            {
                complexDef.description && (
                    <section className="complex-details__section">
                        <h2 className="complex-details__section-title">Описание</h2>

                        <p className="complex-details__panel complex-details__description">
                            {complexDef.description}
                        </p>
                    </section>
                )
            }

            {
                complexDef.scheme.length > 0 ? (
                    <section className="complex-details__section">
                        <h2 className="complex-details__section-title">Схема</h2>

                        <ComplexSchemeView
                            scheme={complexDef.scheme}
                            note={complexDef.schemeNote}
                            resultMetrics={complexDef.resultMetrics}
                        />
                    </section>
                ) : (
                    <>
            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Схема</h2>
                <ComplexScheme complexDef={complexDef} />
            </section>

            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Движение</h2>

                <div className="complex-details__panel">
                <p className="complex-details__movement">
                    {complexDef.movements.map((m) => movementTypeLabels[m]).join(" · ")}
                </p>

                {
                    exercisesAreLinked ? (
                        <ol className="complex-details__exercises">
                            {
                                exercisesList.map((exercise) => (
                                    <li key={exercise.id}>
                                        <Link
                                            to={`/knowledge/exercises/${exercise.id}`}
                                            className="complex-details__exercise-link"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {exercise.name}
                                        </Link>

                                        <span className="complex-details__exercise-type">
                                            {movementTypeLabels[exercise.movementType]}
                                        </span>
                                    </li>
                                ))
                            }
                        </ol>
                    ) : (
                        <p className="complex-details__exercise">{complexDef.exercise}</p>
                    )
                }

                {
                    user?.isAdmin && (
                        <p className="complex-details__login-hint">
                            Схема записана текстом.{" "}
                            <Link to={`/complexes/${complexDef.id}/edit`}>
                                Соберите её из упражнений базы
                            </Link>
                            {" "}— тогда появятся ссылки на упражнения, время и
                            общая мышечная группа.
                        </p>
                    )
                }
                </div>
            </section>
                    </>
                )
            }

            {
                exercisesAreLinked && (
                    <section className="complex-details__section">
                        <h2 className="complex-details__section-title">
                            Нагружаемые мышцы
                        </h2>

                        <div className="complex-details__panel complex-details__muscles">
                            <div className="complex-details__map">
                                <MuscleMap
                                    targetMuscles={muscles.target}
                                    auxiliaryMuscles={muscles.auxiliary}
                                />
                            </div>

                            <div className="complex-details__muscles-text">
                                <MuscleMapLegend
                                    items={
                                        muscles.auxiliary.length > 0
                                            ? ["target", "auxiliary"]
                                            : ["target"]
                                    }
                                />

                                <p>
                                    <strong>Целевые:</strong>{" "}
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

                                <p className="complex-details__muscles-note">
                                    Складывается из мышц всех упражнений комплекса.
                                </p>
                            </div>
                        </div>
                    </section>
                )
            }

            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Результаты</h2>

                <div className="complex-details__panel">
                    {
                        // completions меняется при добавлении, правке и
                        // удалении своего выполнения — рейтинг перезагрузится.
                    }
                    <ComplexLeaderboard
                        complexDef={complexDef}
                        refreshKey={completions}
                    />
                </div>
            </section>

            {
                (complexDef.instructions || complexDef.restrictions) && (
                    <section className="complex-details__section">
                        <div className="complex-details__panel complex-details__notes">
                            {
                                complexDef.instructions && (
                                    <p className="complex-details__instructions">
                                        {complexDef.instructions}
                                    </p>
                                )
                            }
                            {
                                complexDef.restrictions && (
                                    <p className="complex-details__restrictions">
                                        {complexDef.restrictions}
                                    </p>
                                )
                            }
                        </div>
                    </section>
                )
            }

            <section className="complex-details__section">
                {
                    user ? (
                        <ComplexBestResult
                            complexDef={complexDef}
                            best={best}
                            onMarkCompletion={() => setPanel({ mode: "create" })}
                            onShowHistory={() => setPanel({ mode: "history" })}
                        />
                    ) : (
                        <p className="complex-details__login-hint">
                            <Link
                                to="/login"
                                state={{
                                    from: location.pathname + location.search,
                                }}
                            >
                                Войдите
                            </Link>
                            , чтобы отмечать выполнение комплекса и следить за
                            своим лучшим результатом.
                        </p>
                    )
                }
            </section>

            {
                panel.mode === "history" && (
                    <section className="complex-details__section">
                        <h2 className="complex-details__section-title">История выполнений</h2>

                        <ComplexCompletionHistory
                            complexDef={complexDef}
                            completions={completions}
                            onEdit={(completion) => setPanel({ mode: "edit", completion })}
                            onDelete={handleDelete}
                        />
                    </section>
                )
            }

            {
                (panel.mode === "create" || panel.mode === "edit") && (
                    <CompletionFormSection
                        complexDef={complexDef}
                        panel={panel}
                        onSubmit={panel.mode === "edit" ? handleEdit : handleCreate}
                        onCancel={() => setPanel({ mode: "closed" })}
                    />
                )
            }

            <ComplexComments complexId={complexDef.id} />
        </div>
    );
}
