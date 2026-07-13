import type { SelectHTMLAttributes } from "react";

type Option = {
    value: string;
    label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    options: Option[];
};

export default function Select({
    id,
    label,
    options,
    className = "",
    ...props
}: SelectProps) {
    return (
        <div className="select">
            {label && (
                <label
                    className="select__label"
                    htmlFor={id}
                >
                    {label}
                </label>
            )}

            <select
                id={id}
                className={`select__field ${className}`.trim()}
                {...props}
            >
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}