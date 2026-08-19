import type { HomeFeedMode } from "../../types/homeFeedRecord";

import "../../styles/components/home-feed-tabs.css";

type HomeFeedTabsProps = {
    mode: HomeFeedMode;
    onChange: (mode: HomeFeedMode) => void;
};

/** Переключатель вкладок ленты (UX-HOME §12–14). */
export default function HomeFeedTabs({
    mode,
    onChange,
}: HomeFeedTabsProps) {
    return (
        <div
            className="home-feed-tabs"
            role="tablist"
        >
            <button
                type="button"
                role="tab"
                aria-selected={mode === "all"}
                className={`home-feed-tabs__tab ${mode === "all" ? "home-feed-tabs__tab--active" : ""}`}
                onClick={() => onChange("all")}
            >
                Все записи
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={mode === "following"}
                className={`home-feed-tabs__tab ${mode === "following" ? "home-feed-tabs__tab--active" : ""}`}
                onClick={() => onChange("following")}
            >
                Подписки
            </button>
        </div>
    );
}
