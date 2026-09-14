import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import Badge from "../ui/Badge/Badge";
import ComplexStars from "../ComplexStars/ComplexStars";

import "../../styles/components/complex-card.css";

import type { Complex } from "../../types/complex";
import type { ComplexCompletion } from "../../types/complexCompletion";

import { complexTypeLabels, movementLabels } from "../../constants/complexTypes";
import { findBestCompletion } from "../../utils/complexResult";

type ComplexCardProps = {

    complexDef: Complex;

    /** История выполнений текущего пользователя, если уже загружена. */
    completions?: ComplexCompletion[];

};

export default function ComplexCard({ complexDef, completions }: ComplexCardProps) {
    const best = completions ? findBestCompletion(complexDef, completions) : undefined;

    const movementSummary = complexDef.movements
        .map((movement) => movementLabels[movement])
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

            <p className="complex-card__exercise">{complexDef.exercise}</p>

            <div className="complex-card__status">
                {
                    best ? (
                        <span className="complex-card__result">
                            Твой результат: <ComplexStars stars={best.stars} size="sm" />
                        </span>
                    ) : (
                        <span className="complex-card__not-done">Не выполнял</span>
                    )
                }
            </div>

            <Link to={`/complexes/${complexDef.id}`} className="complex-card__link">
                <Button variant="outline">Подробнее</Button>
            </Link>
        </Card>
    );
}

