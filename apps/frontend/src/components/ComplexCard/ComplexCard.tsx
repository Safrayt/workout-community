import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import Badge from "../ui/Badge/Badge";

import "../../styles/components/complex-card.css";

import type { Complex } from "../../types/complex";
import type { ComplexCompletion } from "../../types/complexCompletion";

import { useAuth } from "../../context/CurrentUserContext";

import { complexTypeLabels } from "../../constants/complexTypes";
import { movementTypeLabels } from "../../constants/movementTypes";
import { findBestCompletion, formatCompletionResult } from "../../utils/complexResult";
import { buildSchemeMeta } from "../../utils/complexScheme";

type ComplexCardProps = {

    complexDef: Complex;

    /** История выполнений текущего пользователя, если уже загружена. */
    completions?: ComplexCompletion[];

};

export default function ComplexCard({ complexDef, completions }: ComplexCardProps) {
    const { user } = useAuth();
    const best = completions ? findBestCompletion(complexDef, completions) : undefined;

    const description = complexDef.description.trim();

    const movementSummary = complexDef.movements
        .map((movement) => movementTypeLabels[movement])
        .join(" · ");

    return (
        <Card className="complex-card">
            <div className="complex-card__header">
                <h3 className="complex-card__name">{complexDef.name}</h3>
            </div>

            <div className="complex-card__type-badges">
                {
                    complexDef.types.map((type) => (
                        <Badge key={type} variant="primary">
                            {complexTypeLabels[type]}
                        </Badge>
                    ))
                }
            </div>

            <p className="complex-card__movements">{movementSummary}</p>

            {
                // На плашке — то же описание, что внутри комплекса, чтобы
                // правка описания сразу была видна и в каталоге. Только
                // если описания нет, показываем автоматическую сводку
                // (итоги схемы и список упражнений), чтобы плашка не
                // оставалась пустой.
                description ? (
                    <p className="complex-card__description">{description}</p>
                ) : (
                    <>
                        {
                            // Итоги схемы ("4 упражнения · 11 кругов · 580 повторений").
                            complexDef.scheme.length > 0 && (
                                <p className="complex-card__scheme-meta">
                                    {buildSchemeMeta(complexDef.scheme, complexDef.resultMetrics).join(" · ")}
                                </p>
                            )
                        }

                        <p className="complex-card__exercise">{complexDef.exercise}</p>
                    </>
                )
            }

            {
                // Личный статус показываем только вошедшему: гость ничего
                // не выполнял, и "Не выполнял" на каждой карточке было бы
                // утверждением о человеке, у которого нет аккаунта.
                user && (
                    <div className="complex-card__status">
                        {
                            best ? (
                                <span className="complex-card__result">
                                    Твой результат: {formatCompletionResult(complexDef, best)}
                                </span>
                            ) : (
                                <span className="complex-card__not-done">Не выполнял</span>
                            )
                        }
                    </div>
                )
            }

            <Link to={`/complexes/${complexDef.id}`} className="complex-card__link">
                <Button variant="outline">Подробнее</Button>
            </Link>
        </Card>
    );
}

