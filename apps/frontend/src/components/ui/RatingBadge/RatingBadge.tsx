import "../../../styles/components/rating-badge.css";

import type { CSSProperties } from "react";

import { getRatingTier } from "../../../constants/playgroundRating";

type Props = {
    rating: number;

    /** Показывать "82 из 100" вместо просто "82". По умолчанию — да. */
    showMax?: boolean;
};

type RatingBadgeStyle = CSSProperties & {
    "--rating-color": string;
};

export default function RatingBadge({
    rating,
    showMax = true,
}: Props) {
    const tier = getRatingTier(rating);

    const badgeStyle: RatingBadgeStyle = {
        "--rating-color": tier.color,
    };

    return (
        <span
            className="rating-badge"
            style={badgeStyle}
            title={tier.label}
        >
            <span className="rating-badge__dot" />

            {rating}
            {showMax && " из 100"}
        </span>
    );
}
