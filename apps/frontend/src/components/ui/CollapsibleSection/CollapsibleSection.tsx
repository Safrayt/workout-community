import type { ReactNode } from "react";

import "../../../styles/components/collapsible-section.css";

type CollapsibleSectionProps = {
    title: string;

    children: ReactNode;

    /** По умолчанию свёрнута, чтобы не занимать место при открытии страницы. */
    defaultOpen?: boolean;
};

/**
 * На нативном <details>/<summary> — без лишнего JS-состояния,
 * доступно из коробки (клавиатура, скринридеры), плюс работает
 * даже если что-то пойдёт не так со скриптами.
 */
export default function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: CollapsibleSectionProps) {
    return (
        <details
            className="collapsible-section"
            open={defaultOpen}
        >
            <summary className="collapsible-section__summary">
                <h3 className="collapsible-section__title">
                    {title}
                </h3>

                <span className="collapsible-section__icon" aria-hidden="true" />
            </summary>

            <div className="collapsible-section__content">
                {children}
            </div>
        </details>
    );
}
