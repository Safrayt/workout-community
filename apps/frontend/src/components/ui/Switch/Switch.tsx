import "../../../styles/components/switch.css";

type SwitchProps = {
    id: string;

    checked: boolean;

    onChange: (checked: boolean) => void;

    label: string;

    description?: string;
};

export default function Switch({
    id,
    checked,
    onChange,
    label,
    description,
}: SwitchProps) {
    return (
        <label
            htmlFor={id}
            className="switch-row"
        >
            <span className="switch-row__text">
                <span className="switch-row__label">
                    {label}
                </span>

                {
                    description && (
                        <span className="switch-row__description">
                            {description}
                        </span>
                    )
                }
            </span>

            <span
                className={`switch ${checked ? "switch--on" : ""}`}
            >
                <input
                    id={id}
                    type="checkbox"
                    className="switch__input"
                    checked={checked}
                    onChange={(event) =>
                        onChange(event.target.checked)
                    }
                />

                <span className="switch__track">
                    <span className="switch__thumb" />
                </span>
            </span>
        </label>
    );
}
