import "../../styles/components/complex-leaderboard.css";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../ui/Button/Button";
import ComplexLeaderboardTable from "../ComplexLeaderboardTable/ComplexLeaderboardTable";

import { getComplexLeaderboard } from "../../api/complexes";
import { useAuth } from "../../context/CurrentUserContext";
import type { Complex } from "../../types/complex";
import type { ComplexLeaderboard as ComplexLeaderboardData } from "../../types/complexLeaderboard";

type ComplexLeaderboardProps = {
    complexDef: Complex;

    /**
     * Меняется, когда у пользователя появилось/изменилось/удалилось
     * выполнение, — тогда рейтинг загружается заново.
     */
    refreshKey?: unknown;
};

/**
 * Раздел «Результаты» на странице комплекса: пять лучших, затем
 * текущий пользователь и последнее место (5–7 строк), и кнопка «Все
 * результаты». Данные приходят с сервера уже отобранными.
 */
export default function ComplexLeaderboard({
    complexDef,
    refreshKey,
}: ComplexLeaderboardProps) {
    const { user } = useAuth();

    const [board, setBoard] = useState<ComplexLeaderboardData | undefined>();
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isActual = true;

        getComplexLeaderboard(complexDef.id)
            .then((loaded) => {
                if (isActual) {
                    setBoard(loaded);
                    setHasError(false);
                }
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить рейтинг комплекса:", error);

                if (isActual) {
                    setHasError(true);
                }
            });

        return () => {
            isActual = false;
        };
    }, [complexDef.id, refreshKey]);

    if (hasError && !board) {
        return (
            <p className="complex-leaderboard__message">
                Не удалось загрузить результаты. Попробуйте обновить страницу.
            </p>
        );
    }

    if (!board) {
        return <p className="complex-leaderboard__message">Загрузка…</p>;
    }

    if (board.total === 0) {
        return (
            <p className="complex-leaderboard__message">
                Пока никто не выполнил этот комплекс — станьте первым.
            </p>
        );
    }

    // Свою строку сервер добавляет всегда, если у пользователя есть
    // результат, — значит, её нет только если результата нет.
    const hasOwnResult = board.rows.some((row) => row.isMe);

    return (
        <div className="complex-leaderboard">
            <ComplexLeaderboardTable complexDef={complexDef} rows={board.rows} />

            {
                user && !hasOwnResult && (
                    <p className="complex-leaderboard__message">
                        Вы ещё не выполняли этот комплекс — отметьте выполнение, и ваш
                        результат появится в рейтинге.
                    </p>
                )
            }

            <Link to={`/complexes/${complexDef.id}/results`} className="complex-leaderboard__all">
                <Button type="button" variant="outline">
                    Все результаты
                </Button>
            </Link>
        </div>
    );
}
