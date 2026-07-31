import "../../../styles/components/Textarea.css";

type TextareaProps = {
    error?: string;

    id: string;

    label: string;

    placeholder?: string;

    value: string;

    onChange: (
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) => void;

    rows?: number;
};

export default function Textarea({
    error,
    id,
    label,
    placeholder,
    value,
    onChange,
    rows = 4,
}: TextareaProps) {
    return (
        <div className="textarea-field">

            <label
                htmlFor={id}
                className="textarea-label"
            >
                {label}
            </label>

            <textarea
                id={id}
                className={[
                    "textarea-input",
                    error &&
                        "textarea-input--error",
                ]
                    .filter(Boolean)
                    .join(" ")}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                rows={rows}
                aria-invalid={!!error}
            />

            {
                error && (
                    <small className="textarea-error">
                        {error}
                    </small>
                )
            }

        </div>
    );
}