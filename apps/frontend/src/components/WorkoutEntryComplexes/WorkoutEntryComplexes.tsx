import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ComplexStars from "../ComplexStars/ComplexStars";
import ComplexDifficultyBadge from "../ComplexDifficultyBadge/ComplexDifficultyBadge";

import "../../styles/components/workout-entry-complexes.css";

import type { ComplexCompletion } from "../../types/complexCompletion";

import { useComplexes } from "../../context/ComplexContext";
import { listCompletionsForDiaryEntry } from "../../api/complexes";
import { formatCompletionResult } from "../../utils/complexResult";

type WorkoutEntryComplexesProps = {
    entryId: string;
};

/**
 * Этот блок не является обычным текстом записи — он генерируется на
 * основании существующей связи с выполнением комплекса (п.23
 * UX-документа), а не редактируется вручную вместе с записью.
 */
export default function WorkoutEntryComplexes({ entryId }: WorkoutEntryComplexesProps) {
    const { getComplexById } = useComplexes();
    const [completions, setCompletions] = useState<ComplexCompletion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        listCompletionsForDiaryEntry(entryId)
            .then((result) => {
                if (!cancelled) {
                    setCompletions(result);
                }
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить выполненные комплексы:", error);
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [entryId]);

    if (isLoading || completions.length === 0) {
        return null;
    }

    return (
        <div className="workout-entry-complexes">
            <h3 className="workout-entry-complexes__title">Выполненные комплексы</h3>

            <ul className="workout-entry-complexes__list">
                {
                    completions.map((completion) => {
                        const complexDef = getComplexById(completion.complexId);

                        if (!complexDef) {
                            return null;
                        }

                        return (
                            <li key={completion.id} className="workout-entry-complexes__item">
                                <div className="workout-entry-complexes__info">
                                    <span className="workout-entry-complexes__name">
                                        {complexDef.name}
                                    </span>

                                    <span className="workout-entry-complexes__variant">
                                        {complexDef.exercise}
                                        <ComplexDifficultyBadge difficulty={complexDef.difficulty} />
                                    </span>

                                    <span className="workout-entry-complexes__result">
                                        <ComplexStars stars={completion.stars} size="sm" />
                                        {" "}
                                        {formatCompletionResult(complexDef, completion)}
                                    </span>
                                </div>

                                <Link
                                    to={`/complexes/${complexDef.id}`}
                                    className="workout-entry-complexes__link"
                                >
                                    Открыть комплекс
                                </Link>
                            </li>
                        );
                    })
                }
            </ul>
        </div>
    );
}
