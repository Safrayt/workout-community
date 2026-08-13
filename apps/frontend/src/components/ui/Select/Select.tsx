import type {
    SelectHTMLAttributes,
} from "react";

type Option = {
    value: string;
    label: string;
};

type SelectProps =
    SelectHTMLAttributes<HTMLSelectElement> & {

        label?: string;

        placeholder?: string;

        /** Текст первого пустого пункта. По умолчанию "Выберите...". */
        emptyOptionLabel?: string;

        options: Option[];

        error?: string;

    };

export default function Select({

    id,

    label,

    placeholder,

    emptyOptionLabel = "Выберите...",

    options,

    error,

    className = "",

    ...props

}: SelectProps) {

    return (

        <div className="select">

            {
                label && (

                    <label
                        className="select__label"
                        htmlFor={id}
                    >

                        {label}

                    </label>

                )
            }

            <select

                id={id}

                className={[
                    "select__field",

                    error &&
                        "select__field--error",

                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}

                aria-invalid={!!error}

                {...props}

            >

                <option value="">
                    {emptyOptionLabel}
                </option>

                {
                    placeholder && (

                        <option
                            value=""
                            disabled
                        >

                            {placeholder}

                        </option>

                    )
                }

                {
                    options.map(
                        (option) => (

                            <option

                                key={option.value}

                                value={option.value}

                            >

                                {option.label}

                            </option>

                        )
                    )
                }

            </select>

            {
                error && (

                    <small className="select__error">

                        {error}

                    </small>

                )
            }

        </div>

    );

}