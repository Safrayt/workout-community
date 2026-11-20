import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/components/profile-training.css";

import { listMyCompletions } from "../../api/complexes";
import { useComplexes } from "../../context/ComplexContext";
import type { ComplexCompletion } from "../../types/complexCompletion";
import { pluralizeRu } from "../../utils/pluralize";
import {
    buildProfileComplexes,
    formatProfileDate,
} from "../../utils/profileTraining";

/**
 * Комплексы, которые пользователь выполнял, и его лучший результат в
 * каждом. Показывается только в собственном профиле: история выполнений
 * личная (публично видна лишь лента дневника с блоком комплекса).
 */
export default function ProfileComplexes() {
    const { complexes } = useComplexes();

    const [completions, setCompletions] = useState<ComplexCompletion[] | null>(
        null
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        listMyCompletions()
            .then((loaded) => {
                if (!cancelled) {
                    setCompletions(loaded);
                }
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить выполнения комплексов:", error);

                if (!cancelled) {
                    setFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const items = useMemo(
        () => (completions ? buildProfileComplexes(completions, complexes) : []),
        [completions, complexes]
    );

    if (failed) {
        return (
            <div className="profile-empty">
                <p>Не удалось загрузить выполнения комплексов.</p>
            </div>
        );
    }

    if (completions === null) {
        return (
            <div className="profile-empty">
                <p>Загрузка…</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="profile-empty">
                <p>
                    Пока нет выполненных комплексов. Результат появится здесь,
                    когда вы выполните комплекс и отметите его в дневнике.
                </p>

                <Link to="/complexes">Открыть комплексы</Link>
            </div>
        );
    }

    return (
        <ul className="profile-training">
            {
                items.map((item) => (
                    <li key={item.complex.id} className="profile-training__item">
                        <div className="profile-training__head">
                            <Link
                                to={`/complexes/${item.complex.id}`}
                                className="profile-training__title"
                            >
                                {item.complex.name}
                            </Link>

                            {
                                item.bestResult && (
                                    <span className="profile-training__result">
                                        {item.bestResult}
                                    </span>
                                )
                            }
                        </div>

                        <p className="profile-training__meta">
                            {
                                item.bestResult
                                    ? "Лучший результат"
                                    : "Результат не указан"
                            }
                            {" · "}
                            {item.attempts}{" "}
                            {pluralizeRu(item.attempts, ["выполнение", "выполнения", "выполнений"])}
                            {" · последнее "}
                            {formatProfileDate(item.lastDate)}
                        </p>
                    </li>
                ))
            }
        </ul>
    );
}
