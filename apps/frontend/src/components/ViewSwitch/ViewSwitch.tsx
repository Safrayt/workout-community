import "../../styles/components/view-switch.css";

type ViewSwitchOption<T extends string> = {
    value: T;
    label: string;
};

type ViewSwitchProps<T extends string> = {
    options: readonly ViewSwitchOption<T>[];
    value: T;
    onChange: (value: T) => void;

    /** Что переключается — для экранных читалок ("Что показывать"). */
    ariaLabel: string;
};

/**
 * Переключатель из нескольких равных кнопок на всю ширину ("Фото /
 * Мышцы", "Видео / Мышцы"). Активная кнопка окрашена в --switch-color
 * (по умолчанию зелёный цвет сайта; контейнер может задать свой).
 */
export default function ViewSwitch<T extends string>({
    options,
    value,
    onChange,
    ariaLabel,
}: ViewSwitchProps<T>) {
    return (
        <div className="view-switch" role="group" aria-label={ariaLabel}>
            {
                options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={
                            "view-switch__button" +
                            (option.value === value
                                ? " view-switch__button--active"
                                : "")
                        }
                        aria-pressed={option.value === value}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))
            }
        </div>
    );
}
