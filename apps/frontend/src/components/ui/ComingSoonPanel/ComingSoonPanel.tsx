import type { ReactNode } from "react";

import "../../../styles/components/coming-soon-panel.css";

import SoonBadge from "../SoonBadge/SoonBadge";

type Props = {
    description: string;

    children?: ReactNode;
};

export default function ComingSoonPanel({
    description,
    children,
}: Props) {
    return (
        <div className="coming-soon-panel">
            <div className="coming-soon-panel__header">
                <SoonBadge />
            </div>

            <p className="coming-soon-panel__description">
                {description}
            </p>

            {children}
        </div>
    );
}
