import "../../styles/components/complex-leaderboard.css";

import { Link } from "react-router-dom";

import type { Complex } from "../../types/complex";
import type { ComplexLeaderboardRow } from "../../types/complexLeaderboard";

import { formatLeaderboardValue } from "../../utils/complexResult";

type ComplexLeaderboardTableProps = {
    complexDef: Complex;
    rows: ComplexLeaderboardRow[];
};

/**
 * Строки рейтинга: место, ник (ссылка на профиль), очки. Строка
 * текущего пользователя выделена фоном и жирным (без подписи «вы»).
 * Если места идут не подряд (5 → 18 →
 * 55 в компактном рейтинге), перед строкой пунктирная черта — видно,
 * что между ними есть другие участники.
 */
export default function ComplexLeaderboardTable({
    complexDef,
    rows,
}: ComplexLeaderboardTableProps) {
    return (
        <ol className="complex-leaderboard__list">
            {
                rows.map((row, index) => {
                    const previous = rows[index - 1];
                    const hasGap = previous !== undefined && row.rank - previous.rank > 1;

                    return (
                        <li
                            key={row.userId}
                            className={
                                "complex-leaderboard__row" +
                                (row.isMe ? " complex-leaderboard__row--me" : "") +
                                (hasGap ? " complex-leaderboard__row--gap" : "")
                            }
                        >
                            <span className="complex-leaderboard__rank">{row.rank}</span>

                            <span className="complex-leaderboard__name">
                                <Link
                                    to={`/u/${encodeURIComponent(row.nickname)}`}
                                    className="complex-leaderboard__link"
                                >
                                    {row.nickname}
                                </Link>
                            </span>

                            <span className="complex-leaderboard__value">
                                {formatLeaderboardValue(complexDef, row.value)}
                            </span>
                        </li>
                    );
                })
            }
        </ol>
    );
}
