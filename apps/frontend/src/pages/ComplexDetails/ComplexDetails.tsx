import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ComplexScheme from "../../components/ComplexScheme/ComplexScheme";
import ComplexStarConditionsList from "../../components/ComplexStarConditionsList/ComplexStarConditionsList";
import ComplexBestResult from "../../components/ComplexBestResult/ComplexBestResult";
import ComplexCompletionHistory from "../../components/ComplexCompletionHistory/ComplexCompletionHistory";
import ComplexCompletionForm from "../../components/ComplexCompletionForm/ComplexCompletionForm";
import ComplexComments from "../../components/ComplexComments/ComplexComments";
import Badge from "../../components/ui/Badge/Badge";

import "../../styles/components/complex-details.css";

import type { ComplexCompletion } from "../../types/complexCompletion";
import type { NewComplexCompletion } from "../../types/newComplexCompletion";

import { useComplexes } from "../../context/ComplexContext";
import { useWorkoutDiary } from "../../context/WorkoutDiaryContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

import { complexTypeLabels, movementLabels } from "../../constants/complexTypes";
import { findBestCompletion } from "../../utils/complexResult";

type PanelState =
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; completion: ComplexCompletion }
    | { mode: "history" };

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

    const { entries } = useWorkoutDiary();
    const { currentUser } = useCurrentUser();

    const [panel, setPanel] = useState<PanelState>({ mode: "closed" });

    const complexDef = id ? getComplexById(id) : undefined;
    const completions = id ? completionsByComplex[id] ?? [] : [];

    useEffect(() => {
        if (id) {
            loadCompletions(id).catch((error: unknown) => {
                console.error("Не удалось загрузить историю выполнений:", error);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

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
    const ownEntries = entries.filter((entry) => entry.userId === currentUser.id);

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

    return (
        <div className="complex-details">
            <Link to="/complexes" className="complex-details__back">
                ← Комплексы
            </Link>

            <div className="complex-details__header">
                <h1 className="complex-details__name">{complexDef.name}</h1>
                {
                    complexDef.types.map((type) => (
                        <Badge key={type} variant="primary">
                            {complexTypeLabels[type]}
                        </Badge>
                    ))
                }

                {
                    currentUser.isAdmin && (
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
                complexDef.description && (
                    <p className="complex-details__description">{complexDef.description}</p>
                )
            }

            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Схема</h2>
                <ComplexScheme complexDef={complexDef} />
            </section>

            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Движение</h2>

                <p className="complex-details__movement">
                    {complexDef.movements.map((m) => movementLabels[m]).join(" · ")}
                </p>

                <p className="complex-details__exercise">{complexDef.exercise}</p>
            </section>

            <section className="complex-details__section">
                <h2 className="complex-details__section-title">Условия результата</h2>
                <ComplexStarConditionsList complexDef={complexDef} />
            </section>

            {
                (complexDef.instructions || complexDef.restrictions) && (
                    <section className="complex-details__section">
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
                    </section>
                )
            }

            <section className="complex-details__section">
                <ComplexBestResult
                    complexDef={complexDef}
                    best={best}
                    onMarkCompletion={() => setPanel({ mode: "create" })}
                    onShowHistory={() => setPanel({ mode: "history" })}
                />
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
                            onSubmit={panel.mode === "edit" ? handleEdit : handleCreate}
                            onCancel={() => setPanel({ mode: "closed" })}
                        />
                    </section>
                )
            }

            <ComplexComments complexId={complexDef.id} />
        </div>
    );
}
