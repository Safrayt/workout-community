import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
};

export default function Input({
    label,
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
                className={`input__field ${className}`.trim()}
                {...props}
            />
        </div>
    );
}