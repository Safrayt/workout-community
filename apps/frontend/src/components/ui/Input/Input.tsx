import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;

    error?: string;

};


export default function Input({
    label,
    error,
    className = "",
    id,
    ...props
}: InputProps) {
    return (
    <div className="input">

        {label && (
            <label
                className="input__label"
                htmlFor={id}
            >
                {label}
            </label>
        )}

        <input
            id={id}
            className={[
            "input__field",
            error && "input__field--error",
            className,
        ]
            .filter(Boolean)
            .join(" ")}
            aria-invalid={!!error}
            {...props}
        />

        {
            error && (
                <small className="input__error">
                    {error}
                </small>
            )
        }

    </div>
);
}