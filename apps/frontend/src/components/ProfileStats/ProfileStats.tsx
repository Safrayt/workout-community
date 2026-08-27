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
 * Показатели активности — тренировки, площадки, события, достижения
 * (UX-PROFILE §14, §15).
 *
 * Оформление — как у "быстрых фактов" площадки (PlaygroundQuickFacts):
 * компактная карточка-сетка с мелкой подписью сверху и крупным
 * значением снизу. Это просто сводка, не ссылки — по клику никуда
 * не переходим.
 *
 * Подпись всегда в две строки (по первому пробелу — "Площадок" /
 * "использовано"), а не одной длинной строкой или произвольным
 * переносом по ширине контейнера — так подписи из двух слов
 * выглядят одинаково независимо от ширины экрана.
 */
export default function ProfileStats({
    items,
}: ProfileStatsProps) {
    return (
        <ul className="profile-stats">
            {
                items.map((item) => {
                    const [firstWord, ...restWords] =
                        item.label.split(" ");
                    const secondLine = restWords.join(" ");

                    return (
                        <li
                            key={item.key}
                            className="profile-stats__item"
                        >
                            <div className="profile-stats__link">
                                <span className="profile-stats__label">
                                    {firstWord}
                                    {secondLine && (
                                        <>
                                            <br />
                                            {secondLine}
                                        </>
                                    )}
                                </span>

                                <span className="profile-stats__value">
                                    {item.value}
                                </span>
                            </div>
                        </li>
                    );
                })
            }
        </ul>
    );
}
