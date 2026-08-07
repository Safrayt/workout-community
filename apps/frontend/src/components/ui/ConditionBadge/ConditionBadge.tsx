import "../../../styles/components/condition-badge.css";

import type { CSSProperties } from "react";

import type { PlaygroundCondition } from "../../../types/playground";

import {
    playgroundConditionColors,
    playgroundConditionLabels,
} from "../../../constants/playgroundProperties";

type Props = {
    condition: PlaygroundCondition;
};

type ConditionBadgeStyle = CSSProperties & {
    "--condition-color": string;
};

export default function ConditionBadge({
    condition,
}: Props) {
    const badgeStyle: ConditionBadgeStyle = {
        "--condition-color": playgroundConditionColors[condition],
    };

    return (
        <span
            className="condition-badge"
            style={badgeStyle}
        >
            <span className="condition-badge__dot" />

            {playgroundConditionLabels[condition]}
        </span>
    );
}
