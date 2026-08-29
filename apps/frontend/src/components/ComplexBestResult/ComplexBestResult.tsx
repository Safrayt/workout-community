import Button from "../ui/Button/Button";
import ComplexStars from "../ComplexStars/ComplexStars";

import "../../styles/components/complex-best-result.css";

import type { Complex } from "../../types/complex";
import type { ComplexCompletion } from "../../types/complexCompletion";

import { formatDate } from "../../utils/formatDate";
import { formatCompletionResult } from "../../utils/complexResult";

type ComplexBestResultProps = {

    complexDef: Complex;

    best?: ComplexCompletion;

    onMarkCompletion: () => void;

    onShowHistory: () => void;

};

export default function ComplexBestResult({
    complexDef,
    best,
    onMarkCompletion,
    onShowHistory,
}: ComplexBestResultProps) {
    if (!best) {
        return (
            <div className="complex-best-result complex-best-result--empty">
                <p className="complex-best-result__hint">
                    Ты ещё не выполнял этот комплекс
                </p>

                <Button onClick={onMarkCompletion}>Отметить выполнение</Button>
            </div>
        );
    }

    return (
        <div className="complex-best-result">
            <p className="complex-best-result__label">Твой лучший результат</p>

            <ComplexStars stars={best.stars} />

            <p className="complex-best-result__value">
                {formatCompletionResult(complexDef, best)}
            </p>

            <p className="complex-best-result__date">{formatDate(best.completedDate)}</p>

            <div className="complex-best-result__actions">
                <Button onClick={onMarkCompletion}>Отметить новое выполнение</Button>

                <Button variant="outline" onClick={onShowHistory}>
                    Посмотреть историю
                </Button>
            </div>
        </div>
    );
}
