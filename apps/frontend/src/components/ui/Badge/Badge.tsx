import type { ReactNode } from "react";

type BadgeVariant =
    | "primary"
    | "success"
    | "warning"
    | "danger";

type BadgeProps = {
    children: ReactNode;
    variant?: BadgeVariant;
};

export default function Badge({
    children,
    variant = "primary",
}: BadgeProps) {
    return (
        <span className={`badge badge--${variant}`}>
            {children}
        </span>
    );
}