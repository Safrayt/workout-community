import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Select from "../../components/ui/Select/Select";
import Button from "../../components/ui/Button/Button";
import ComplexCard from "../../components/ComplexCard/ComplexCard";
import ComplexTypeFilter from "../../components/ComplexTypeFilter/ComplexTypeFilter";

import "../../styles/components/complexes-page.css";

import { useComplexes } from "../../context/ComplexContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

import {
    movementFilterOptions,
    personalStatusFilterOptions,
    type PersonalStatusFilter,
} from "../../constants/complexTypes";
import type { ComplexType, MovementType } from "../../types/complex";

import { findBestCompletion } from "../../utils/complexResult";

export default function Complexes() {
    const {
        complexes,
        isLoading,
        completionsByComplex,
        loadCompletions,
    } = useComplexes();

    const { currentUser } = useCurrentUser();

    const [typeFilters, setTypeFilters] = useState<ComplexType[]>([]);
    const [movementFilter, setMovementFilter] = useState<MovementType | "">("");
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
        // Несколько выбранных тегов — по И: комплекс проходит, только
        // если у него есть КАЖДЫЙ из отмеченных тегов.
        if (
            typeFilters.length > 0 &&
            !typeFilters.every((type) => complexDef.types.includes(type))
        ) {
            return false;
        }

        if (movementFilter && !complexDef.movements.includes(movementFilter)) {
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
            <div className="complexes-page__header">
                <h1 className="complexes-page__title">Комплексы</h1>

                {
                    currentUser.isAdmin && (
                        <Link to="/complexes/create">
                            <Button type="button" variant="primary">
                                Добавить комплекс
                            </Button>
                        </Link>
                    )
                }
            </div>

            <div className="complexes-page__filters">
                <ComplexTypeFilter
                    selectedTypes={typeFilters}
                    onChange={setTypeFilters}
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
