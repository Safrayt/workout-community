import type { ReactNode } from "react";

import "../../../styles/components/InfoSection.css";

type InfoSectionProps = {
    title: string;

    children: ReactNode;

    className?: string;
};

export default function InfoSection({
    title,
    children,
    className,
}: InfoSectionProps) {
    return (
        <section
            className={
                className
                    ? `info-section ${className}`
                    : "info-section"
            }
        >
            <h3 className="info-section__title">
                {title}
            </h3>

            <div className="info-section__content">
                {children}
            </div>
        </section>
    );
}