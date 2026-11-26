import { useState } from "react";

import "../../styles/components/weight-field.css";

type WeightMode = "none" | "weighted" | "assisted";

type WeightFieldProps = {
    /** Вес со знаком: плюс — утяжелитель, минус — помощь (резинка,
     *  гравитрон). Нет значения — без дополнительного веса. */
    value: number | undefined;

    onChange: (value: number | undefined) => void;

    /** Подпись для скринридеров, например название упражнения. */
    ariaContext?: string;
};

const MAX_WEIGHT_KG = 500;

function modeOf(value: number | undefined): WeightMode {
    if (value === undefined || value === 0) {
        return "none";
    }

    return value > 0 ? "weighted" : "assisted";
}

/**
 * Дополнительный вес упражнения одним полем со знаком: «Утяжелитель»
 * (+кг: жилет, блин) или «Помощь» (−кг: резинка, гравитрон), чтобы
 * не вводить минус на цифровой клавиатуре телефона. По умолчанию —
 * «Без веса»: большинству он не нужен.
 */
export default function WeightField({
    value,
    onChange,
    ariaContext = "",
}: WeightFieldProps) {
    const [mode, setMode] = useState<WeightMode>(modeOf(value));

    const amount = value === undefined ? "" : String(Math.abs(value));

    function changeMode(next: WeightMode) {
        setMode(next);

        if (next === "none") {
            onChange(undefined);
        } else if (value !== undefined) {
            onChange(next === "assisted" ? -Math.abs(value) : Math.abs(value));
        }
    }

    function changeAmount(raw: string) {
        const parsed = Number(raw.replace(",", "."));

        if (raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0) {
            onChange(undefined);
            return;
        }

        const kg = Math.min(MAX_WEIGHT_KG, Math.round(parsed * 100) / 100);

        onChange(mode === "assisted" ? -kg : kg);
    }

    return (
        <div className="weight-field">
            <select
                className="weight-field__mode"
                aria-label={`Вес${ariaContext ? `: ${ariaContext}` : ""}`}
                value={mode}
                onChange={(event) => changeMode(event.target.value as WeightMode)}
            >
                <option value="none">Без доп. веса</option>
                <option value="weighted">Утяжелитель (+ кг)</option>
                <option value="assisted">Помощь: резинка, гравитрон (− кг)</option>
            </select>

            {mode !== "none" && (
                <label className="weight-field__amount">
                    <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={MAX_WEIGHT_KG}
                        step={0.5}
                        className="weight-field__input"
                        aria-label={`Килограммов${ariaContext ? `: ${ariaContext}` : ""}`}
                        value={amount}
                        onChange={(event) => changeAmount(event.target.value)}
                    />

                    <span>кг</span>
                </label>
            )}
        </div>
    );
}
