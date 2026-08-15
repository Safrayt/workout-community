import "../../styles/components/profile-stats.css";

export type ProfileStatItem = {
    key: string;

    value: number;

    label: string;
};

type ProfileStatsProps = {
    items: ProfileStatItem[];
};

/**
 * Ровно четыре показателя активности — тренировки, площадки,
 * события, достижения. Намеренно не dashboard из десятков метрик
 * (UX-PROFILE §14, §15).
 *
 * Оформление — как у "быстрых фактов" площадки (PlaygroundQuickFacts):
 * компактная карточка-сетка с мелкой подписью сверху и крупным
 * значением снизу. Это просто сводка, не ссылки — по клику никуда
 * не переходим.
 */
export default function ProfileStats({
    items,
}: ProfileStatsProps) {
    return (
        <ul className="profile-stats">
            {
                items.map((item) => (
                    <li
                        key={item.key}
                        className="profile-stats__item"
                    >
                        <div className="profile-stats__link">
                            <span className="profile-stats__label">
                                {item.label}
                            </span>

                            <span className="profile-stats__value">
                                {item.value}
                            </span>
                        </div>
                    </li>
                ))
            }
        </ul>
    );
}
