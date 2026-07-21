import type { ReactNode } from "react";

import "../../../styles/components/InfoRow.css";

type InfoRowProps = {
    label: string;

    children: ReactNode;
};

export default function InfoRow({
    label,
    children,
}: InfoRowProps) {
    return (
        <p className="info-row">
            <strong className="info-row__label">
                {label}
            </strong>

            <span className="info-row__value">
                {children}
            </span>
        </p>
    );
}