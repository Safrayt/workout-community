import "../../../styles/components/Textarea.css";

type TextareaProps = {
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
                className="textarea-input"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                rows={rows}
            />

        </div>
    );
}