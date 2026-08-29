import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";
import ComplexStars from "../ComplexStars/ComplexStars";

import "../../styles/components/complex-completion-history.css";

import type { Complex } from "../../types/complex";
import type { ComplexCompletion } from "../../types/complexCompletion";

import { formatDate } from "../../utils/formatDate";
import { formatCompletionResult } from "../../utils/complexResult";

type ComplexCompletionHistoryProps = {

    complexDef: Complex;

    completions: ComplexCompletion[];

    onEdit: (completion: ComplexCompletion) => void;

    onDelete: (completion: ComplexCompletion) => void;

};

export default function ComplexCompletionHistory({
    complexDef,
    completions,
    onEdit,
    onDelete,
}: ComplexCompletionHistoryProps) {
    const sorted = [...completions].sort(
        (a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    );

    if (sorted.length === 0) {
        return (
            <p className="complex-completion-history__empty">
                Ты ещё не выполнял этот комплекс.
            </p>
        );
    }

    return (
        <ul className="complex-completion-history">
            {
                sorted.map((completion) => (
                    <li key={completion.id} className="complex-completion-history__item">
                        <div className="complex-completion-history__main">
                            <span className="complex-completion-history__date">
                                {formatDate(completion.completedDate)}
                            </span>

                            <ComplexStars stars={completion.stars} size="sm" />

                            <span className="complex-completion-history__result">
                                {formatCompletionResult(complexDef, completion)}
                            </span>
                        </div>

                        <div className="complex-completion-history__footer">
                            {
                                completion.diaryEntryId ? (
                                    <Link
                                        to={`/diary/${completion.diaryEntryId}`}
                                        className="complex-completion-history__diary-link"
                                    >
                                        Открыть запись
                                    </Link>
                                ) : (
                                    <span className="complex-completion-history__no-diary">
                                        ⚠ Запись дневника больше недоступна
                                    </span>
                                )
                            }

                            <div className="complex-completion-history__actions">
                                <Button variant="outline" onClick={() => onEdit(completion)}>
                                    Редактировать
                                </Button>

                                <Button variant="outline" onClick={() => onDelete(completion)}>
                                    Удалить
                                </Button>
                            </div>
                        </div>
                    </li>
                ))
            }
        </ul>
    );
}
