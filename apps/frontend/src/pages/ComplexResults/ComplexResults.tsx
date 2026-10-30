import "../../styles/components/complex-leaderboard.css";
import "../../styles/components/complex-results.css";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";

import Button from "../../components/ui/Button/Button";
import ComplexLeaderboardTable from "../../components/ComplexLeaderboardTable/ComplexLeaderboardTable";

import { getFullComplexLeaderboard } from "../../api/complexes";
import { useComplexes } from "../../context/ComplexContext";
import type { ComplexLeaderboardRow } from "../../types/complexLeaderboard";

// Сколько строк грузится за раз; дальше — кнопка «Показать ещё».
const PAGE_SIZE = 50;

/**
 * «Все результаты» — рейтинг комплекса по всем пользователям: у каждого
 * учитывается лучшее выполнение (см. get_full_leaderboard на бэкенде).
 */
export default function ComplexResults() {
    const { id } = useParams();
    const { getComplexById, isLoading } = useComplexes();

    const complexDef = id ? getComplexById(id) : undefined;

    const [rows, setRows] = useState<ComplexLeaderboardRow[]>([]);
    const [total, setTotal] = useState(0);
    const [isFetching, setIsFetching] = useState(true);
    const [hasError, setHasError] = useState(false);

    async function loadPage(offset: number) {
        if (!id) return;

        setIsFetching(true);
        setHasError(false);

        try {
            const page = await getFullComplexLeaderboard(id, PAGE_SIZE, offset);

            setTotal(page.total);
            setRows((current) => (offset === 0 ? page.rows : [...current, ...page.rows]));
        } catch (error: unknown) {
            console.error("Не удалось загрузить результаты комплекса:", error);
            setHasError(true);
        } finally {
            setIsFetching(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPage(0);
        // loadPage зависит только от id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    usePageMeta(complexDef ? `Результаты: ${complexDef.name}` : undefined);

    if (isLoading) {
        return <p className="complex-results__message">Загрузка…</p>;
    }

    if (!complexDef) {
        return (
            <div className="complex-results">
                <p className="complex-results__message">Комплекс не найден.</p>
                <Link to="/complexes">← К списку комплексов</Link>
            </div>
        );
    }

    return (
        <div className="complex-results">
            <Link to={`/complexes/${complexDef.id}`} className="complex-results__back">
                ← К комплексу
            </Link>

            <h1 className="complex-results__title">Результаты: {complexDef.name}</h1>

            <p className="complex-results__hint">
                У каждого участника учитывается его лучший результат.
                {total > 0 && ` Участников: ${total}.`}
            </p>

            {
                rows.length > 0 && (
                    <div className="complex-results__panel">
                        <ComplexLeaderboardTable complexDef={complexDef} rows={rows} />
                    </div>
                )
            }

            {
                !isFetching && !hasError && rows.length === 0 && (
                    <p className="complex-results__message">
                        Пока никто не выполнил этот комплекс.
                    </p>
                )
            }

            {
                hasError && (
                    <p className="complex-results__message">
                        Не удалось загрузить результаты. Попробуйте ещё раз.
                    </p>
                )
            }

            {
                isFetching && <p className="complex-results__message">Загрузка…</p>
            }

            {
                !isFetching && rows.length < total && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadPage(rows.length)}
                    >
                        Показать ещё
                    </Button>
                )
            }

            {
                !isFetching && hasError && rows.length === 0 && (
                    <Button type="button" variant="outline" onClick={() => void loadPage(0)}>
                        Повторить
                    </Button>
                )
            }
        </div>
    );
}
