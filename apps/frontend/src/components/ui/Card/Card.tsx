import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    className?: string;
};

export default function Card({
    children,
    className = "",
    ...rest
}: CardProps) {
    return (
        <div
            className={`card ${className}`.trim()}
            {...rest}
        >
            {children}
        </div>
    );
}