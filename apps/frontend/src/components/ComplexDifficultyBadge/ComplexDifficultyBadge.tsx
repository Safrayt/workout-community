import "../../styles/components/complex-difficulty-badge.css";

import type { CSSProperties } from "react";

import type { DifficultyTier } from "../../types/complex";

import { difficultyLabels } from "../../constants/complexTypes";

type DifficultyBadgeStyle = CSSProperties & {
    "--difficulty-color": string;
};

const difficultyColors: Record<DifficultyTier, string> = {
    iron: "#5b6270",
    steel: "#4a7ba6",
    titanium: "#7c5cbf",
};

type ComplexDifficultyBadgeProps = {
    difficulty: DifficultyTier;
};

export default function ComplexDifficultyBadge({
    difficulty,
}: ComplexDifficultyBadgeProps) {
    const badgeStyle: DifficultyBadgeStyle = {
        "--difficulty-color": difficultyColors[difficulty],
    };

    return (
        <span className="complex-difficulty-badge" style={badgeStyle}>
            <span className="complex-difficulty-badge__dot" />
            {difficultyLabels[difficulty]}
        </span>
    );
}
