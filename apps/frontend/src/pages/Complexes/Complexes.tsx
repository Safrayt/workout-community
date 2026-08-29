import { useEffect, useState } from "react";

import Select from "../../components/ui/Select/Select";
import ComplexCard from "../../components/ComplexCard/ComplexCard";

import "../../styles/components/complexes-page.css";

import { useComplexes } from "../../context/ComplexContext";

import {
    complexTypeFilterOptions,
    difficultyFilterOptions,
    movementFilterOptions,
    personalStatusFilterOptions,
    type PersonalStatusFilter,
} from "../../constants/complexTypes";
import type { DifficultyTier, MovementType } from "../../types/complex";

import { findBestCompletion } from "../../utils/complexResult";

export default function Complexes() {
    const {
        complexes,
        isLoading,
        completionsByComplex,
        loadCompletions,
    } = useComplexes();

    const [typeFilter, setTypeFilter] = useState("");
    const [movementFilter, setMovementFilter] = useState<MovementType | "">("");
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyTier | "">("");
    const [statusFilter, setStatusFilter] = useState<PersonalStatusFilter>("");

    // Личный статус зависит от истории выполнений — подгружаем её для
    // каждого комплекса каталога один раз, чтобы фильтр и карточки
    // сразу показывали актуальный результат.
    useEffect(() => {
        complexes.forEach((complexDef) => {
            if (!completionsByComplex[complexDef.id]) {
                loadCompletions(complexDef.id).catch((error: unknown) => {
                    console.error(
                        `Не удалось загрузить историю комплекса ${complexDef.id}:`,
                        error
                    );
                });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complexes]);

    const filteredComplexes = complexes.filter((complexDef) => {
        if (typeFilter && complexDef.type !== typeFilter) {
            return false;
        }

        if (movementFilter && !complexDef.movements.includes(movementFilter)) {
            return false;
        }

        if (difficultyFilter && complexDef.difficulty !== difficultyFilter) {
            return false;
        }

        if (statusFilter !== "") {
            const completions = completionsByComplex[complexDef.id] ?? [];
            const best = findBestCompletion(complexDef, completions);

            if (statusFilter === "not-done" && best) return false;
            if (statusFilter === "done" && !best) return false;
            if (statusFilter === "two-stars" && best?.stars !== 2) return false;
            if (statusFilter === "three-stars" && best?.stars !== 3) return false;
        }

        return true;
    });

    return (
        <div className="complexes-page">
            <h1 className="complexes-page__title">Комплексы</h1>

            <div className="complexes-page__filters">
                <Select
                    id="complex-type-filter"
                    label="Тип"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    options={complexTypeFilterOptions}
                    emptyOptionLabel="Все"
                />

                <Select
                    id="complex-movement-filter"
                    label="Движение"
                    value={movementFilter}
                    onChange={(event) =>
                        setMovementFilter(event.target.value as MovementType | "")
                    }
                    options={movementFilterOptions}
                    emptyOptionLabel="Все"
                />

                <Select
                    id="complex-difficulty-filter"
                    label="Сложность"
                    value={difficultyFilter}
                    onChange={(event) =>
                        setDifficultyFilter(event.target.value as DifficultyTier | "")
                    }
                    options={difficultyFilterOptions}
                    emptyOptionLabel="Все"
                />

                <Select
                    id="complex-status-filter"
                    label="Личный статус"
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(event.target.value as PersonalStatusFilter)
                    }
                    options={personalStatusFilterOptions}
                    emptyOptionLabel="Все"
                />
            </div>

            {
                isLoading ? (
                    <p className="complexes-page__loading">Загрузка каталога…</p>
                ) : filteredComplexes.length === 0 ? (
                    <p className="complexes-page__empty">
                        По выбранным фильтрам комплексов не найдено.
                    </p>
                ) : (
                    <div className="complexes-page__grid">
                        {
                            filteredComplexes.map((complexDef) => (
                                <ComplexCard
                                    key={complexDef.id}
                                    complexDef={complexDef}
                                    completions={completionsByComplex[complexDef.id]}
                                />
                            ))
                        }
                    </div>
                )
            }
        </div>
    );
}
