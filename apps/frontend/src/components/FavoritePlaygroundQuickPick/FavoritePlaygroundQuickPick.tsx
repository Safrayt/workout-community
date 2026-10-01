import "../../styles/components/favorite-playground-quick-pick.css";

import type { Playground } from "../../types/playground";

type FavoritePlaygroundQuickPickProps = {
    /** Уже отобранные площадки (не больше нескольких штук). */
    playgrounds: Playground[];

    /** id выбранной сейчас площадки — её кнопка подсвечивается. */
    selectedPlaygroundId?: string;

    onSelect: (playground: Playground) => void;
};

/**
 * Быстрый выбор площадки из избранного — кнопки под картой в форме
 * записи дневника. Не заменяет выбор на карте, а дополняет его:
 * привычную площадку можно выбрать одним нажатием, не разыскивая её
 * на карте. Повторное нажатие на выбранную площадку отменяет выбор
 * (это решает родитель — здесь только сообщаем о нажатии).
 */
export default function FavoritePlaygroundQuickPick({
    playgrounds,
    selectedPlaygroundId,
    onSelect,
}: FavoritePlaygroundQuickPickProps) {
    if (playgrounds.length === 0) {
        return null;
    }

    return (
        <div className="favorite-quick-pick">
            <p className="favorite-quick-pick__title" id="favorite-quick-pick-title">
                Из избранного
            </p>

            <div
                className="favorite-quick-pick__list"
                role="group"
                aria-labelledby="favorite-quick-pick-title"
            >
                {
                    playgrounds.map((playground) => {
                        const isSelected =
                            playground.id === selectedPlaygroundId;

                        return (
                            <button
                                key={playground.id}
                                type="button"
                                className={`favorite-quick-pick__item ${isSelected ? "favorite-quick-pick__item--selected" : ""}`}
                                aria-pressed={isSelected}
                                title={
                                    (playground.locality
                                        ? `${playground.name}, ${playground.locality}`
                                        : playground.name) +
                                    (isSelected
                                        ? " — нажмите, чтобы отменить выбор"
                                        : "")
                                }
                                onClick={() => onSelect(playground)}
                            >
                                <span className="favorite-quick-pick__name">
                                    {playground.name}
                                </span>

                                {
                                    playground.locality && (
                                        <span className="favorite-quick-pick__locality">
                                            {playground.locality}
                                        </span>
                                    )
                                }
                            </button>
                        );
                    })
                }
            </div>
        </div>
    );
}
