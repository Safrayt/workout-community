import { useState } from "react";

import FormSection from "../ui/FormSection/FormSection";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Select from "../ui/Select/Select";
import TagBadge from "../ui/TagBadge/TagBadge";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";

import "../../styles/components/complex-form.css";

import type { ValidationError } from "../../validation";
import { validateComplex } from "../../validation/complex";
import { getFieldError } from "../../utils/validation.ts";

import {
    complexTypeFilterOptions,
    metricLabels,
    movementFilterOptions,
} from "../../constants/complexTypes";
import type {
    ComparisonOperator,
    MetricType,
    StarCondition,
} from "../../types/complex";
import type { NewComplex } from "../../types/newComplex";

const metricOptions = (Object.keys(metricLabels) as MetricType[]).map(
    (value) => ({ value, label: metricLabels[value] })
);

const operatorOptions: { value: ComparisonOperator; label: string }[] = [
    { value: "lte", label: "не больше (≤)" },
    { value: "gte", label: "не меньше (≥)" },
    { value: "eq", label: "равно (=)" },
];

type ComplexFormProps = {
    initialValue: NewComplex;

    submitLabel: string;

    /** true при редактировании — id уже существующей записи не меняется. */
    isEditing?: boolean;

    onSubmit: (complex: NewComplex) => void;

    onCancel: () => void;
};

/**
 * Форма каталога комплексов — доступна только администратору (см.
 * app/RequireAdmin.tsx и страницы ComplexCreate/ComplexEdit). Схема
 * полей зеркалит app/models_complex.py: Complex/ComplexCreate — если
 * там появится новое поле, здесь тоже нужно завести для него ввод.
 */
export default function ComplexForm({
    initialValue,
    submitLabel,
    isEditing = false,
    onSubmit,
    onCancel,
}: ComplexFormProps) {
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [complex, setComplex] = useState<NewComplex>(initialValue);

    // Текстовое поле для scheme_steps — вводится как "1, 2, 3, 4, 5"
    // и парсится в NewComplex.schemeSteps (number[] | null) только
    // при отправке; хранить в состоянии сразу как строку проще, чем
    // разбирать на каждое нажатие клавиши, когда ввод ещё не завершён.
    const [schemeStepsText, setSchemeStepsText] = useState(
        initialValue.schemeSteps ? initialValue.schemeSteps.join(", ") : ""
    );

    function updateField<K extends keyof NewComplex>(
        field: K,
        value: NewComplex[K]
    ) {
        setComplex((current) => ({ ...current, [field]: value }));
        setErrors((current) => current.filter((error) => error.field !== field));
    }

    function toggleListValue<K extends "types" | "movements" | "resultMetrics">(
        field: K,
        value: NewComplex[K][number]
    ) {
        setComplex((current) => {
            // Приведение к string[] — TypeScript не может сопоставить
            // типы внутри тела дженерика, объединяющего три разных по
            // элементам массива (типичное ограничение TS для union по
            // ключам); снаружи функция всё равно остаётся строго
            // типизированной за счёт сигнатуры выше.
            const list = current[field] as unknown as string[];
            const stringValue = value as unknown as string;

            return {
                ...current,
                [field]: list.includes(stringValue)
                    ? list.filter((item) => item !== stringValue)
                    : [...list, stringValue],
            };
        });
    }

    function parseSchemeSteps(text: string): number[] | null {
        const trimmed = text.trim();

        if (trimmed.length === 0) {
            return null;
        }

        const values = trimmed
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((value) => Number.isFinite(value));

        return values.length > 0 ? values : null;
    }

    function starConditionFor(stars: 2 | 3): StarCondition | undefined {
        return complex.starConditions.find((c) => c.stars === stars);
    }

    function toggleStarCondition(stars: 2 | 3, enabled: boolean) {
        if (!enabled) {
            updateField(
                "starConditions",
                complex.starConditions.filter((c) => c.stars !== stars)
            );
            return;
        }

        const defaultMetric = complex.resultMetrics[0] ?? "reps";

        updateField("starConditions", [
            ...complex.starConditions,
            { stars, metric: defaultMetric, operator: "gte", value: 0, unit: "" },
        ]);
    }

    function updateStarCondition(
        stars: 2 | 3,
        patch: Partial<StarCondition>
    ) {
        updateField(
            "starConditions",
            complex.starConditions.map((c) =>
                c.stars === stars ? { ...c, ...patch } : c
            )
        );
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const finalComplex: NewComplex = {
            ...complex,
            schemeSteps: parseSchemeSteps(schemeStepsText),
        };

        const result = validateComplex(finalComplex, { isEditing });

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);
        onSubmit(finalComplex);
    }

    return (
        <form className="complex-form" onSubmit={handleSubmit}>
            <FormSection title="Основное">
                <Input
                    id="complex-id"
                    label="id (используется в ссылке, менять после создания нельзя)"
                    value={complex.id}
                    onChange={(event) => updateField("id", event.target.value)}
                    placeholder="hannibal-scheme-steel"
                    disabled={isEditing}
                    error={getFieldError(errors, "id")}
                />

                <Input
                    id="complex-name"
                    label="Название"
                    value={complex.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    error={getFieldError(errors, "name")}
                />

                <Textarea
                    id="complex-description"
                    label="Описание"
                    value={complex.description}
                    onChange={(event) =>
                        updateField("description", event.target.value)
                    }
                    rows={4}
                />
            </FormSection>

            <FormSection title="Формат тренировки">
                <div className="complex-form__tag-row">
                    {
                        complexTypeFilterOptions.map((option) => (
                            <TagBadge
                                key={option.value}
                                label={option.label}
                                active={complex.types.includes(option.value)}
                                onClick={() =>
                                    toggleListValue("types", option.value)
                                }
                            />
                        ))
                    }
                </div>
                {
                    getFieldError(errors, "types") && (
                        <small className="complex-form__error">
                            {getFieldError(errors, "types")}
                        </small>
                    )
                }
            </FormSection>

            <FormSection title="Движения (для фильтра каталога)">
                <div className="complex-form__tag-row">
                    {
                        movementFilterOptions.map((option) => (
                            <TagBadge
                                key={option.value}
                                label={option.label}
                                active={complex.movements.includes(option.value)}
                                onClick={() =>
                                    toggleListValue("movements", option.value)
                                }
                            />
                        ))
                    }
                </div>
                {
                    getFieldError(errors, "movements") && (
                        <small className="complex-form__error">
                            {getFieldError(errors, "movements")}
                        </small>
                    )
                }
            </FormSection>

            <FormSection title="Упражнение и схема">
                <Textarea
                    id="complex-exercise"
                    label="Упражнение(я)"
                    value={complex.exercise}
                    onChange={(event) =>
                        updateField("exercise", event.target.value)
                    }
                    rows={2}
                    error={getFieldError(errors, "exercise")}
                />

                <Input
                    id="complex-scheme-display"
                    label="Схема выполнения (текст для карточки)"
                    value={complex.schemeDisplay}
                    onChange={(event) =>
                        updateField("schemeDisplay", event.target.value)
                    }
                    placeholder="10+30+10+20 → 5+20+5+10"
                    error={getFieldError(errors, "schemeDisplay")}
                />

                <Input
                    id="complex-scheme-steps"
                    label="Числовая лесенка через запятую (необязательно)"
                    value={schemeStepsText}
                    onChange={(event) => setSchemeStepsText(event.target.value)}
                    placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
                />

                <Input
                    id="complex-total-reps"
                    label="Всего повторений за один подход комплекса (необязательно)"
                    type="number"
                    min={0}
                    value={complex.totalReps ?? ""}
                    onChange={(event) =>
                        updateField(
                            "totalReps",
                            event.target.value === ""
                                ? null
                                : Number(event.target.value)
                        )
                    }
                />
            </FormSection>

            <FormSection title="Показатели результата">
                <div className="complex-form__tag-row">
                    {
                        metricOptions.map((option) => (
                            <TagBadge
                                key={option.value}
                                label={option.label}
                                active={complex.resultMetrics.includes(
                                    option.value
                                )}
                                onClick={() =>
                                    toggleListValue(
                                        "resultMetrics",
                                        option.value
                                    )
                                }
                            />
                        ))
                    }
                </div>
                {
                    getFieldError(errors, "resultMetrics") && (
                        <small className="complex-form__error">
                            {getFieldError(errors, "resultMetrics")}
                        </small>
                    )
                }
            </FormSection>

            <FormSection title="Условия 2 и 3 звёзд">
                <p className="complex-form__hint">
                    1 звезда присваивается автоматически за сам факт
                    выполнения — отдельно её настраивать не нужно.
                </p>

                {
                    ([2, 3] as const).map((stars) => {
                        const condition = starConditionFor(stars);

                        return (
                            <div
                                key={stars}
                                className="complex-form__star-condition"
                            >
                                <label className="complex-form__star-toggle">
                                    <input
                                        type="checkbox"
                                        checked={!!condition}
                                        onChange={(event) =>
                                            toggleStarCondition(
                                                stars,
                                                event.target.checked
                                            )
                                        }
                                    />
                                    {"⭐".repeat(stars)} — условие
                                </label>

                                {
                                    condition && (
                                        <div className="complex-form__star-fields">
                                            <Select
                                                id={`complex-star-${stars}-metric`}
                                                label="Показатель"
                                                value={condition.metric}
                                                onChange={(event) =>
                                                    updateStarCondition(
                                                        stars,
                                                        {
                                                            metric: event.target
                                                                .value as MetricType,
                                                        }
                                                    )
                                                }
                                                options={complex.resultMetrics.map(
                                                    (metric) => ({
                                                        value: metric,
                                                        label: metricLabels[
                                                            metric
                                                        ],
                                                    })
                                                )}
                                            />

                                            <Select
                                                id={`complex-star-${stars}-operator`}
                                                label="Условие"
                                                value={condition.operator}
                                                onChange={(event) =>
                                                    updateStarCondition(
                                                        stars,
                                                        {
                                                            operator: event
                                                                .target
                                                                .value as ComparisonOperator,
                                                        }
                                                    )
                                                }
                                                options={operatorOptions}
                                            />

                                            <Input
                                                id={`complex-star-${stars}-value`}
                                                label={
                                                    condition.metric ===
                                                        "time" ||
                                                    condition.metric ===
                                                        "duration"
                                                        ? "Значение (секунды)"
                                                        : "Значение"
                                                }
                                                type="number"
                                                value={condition.value}
                                                onChange={(event) =>
                                                    updateStarCondition(
                                                        stars,
                                                        {
                                                            value: Number(
                                                                event.target
                                                                    .value
                                                            ),
                                                        }
                                                    )
                                                }
                                            />

                                            <Input
                                                id={`complex-star-${stars}-unit`}
                                                label="Единица измерения (необязательно)"
                                                value={condition.unit}
                                                onChange={(event) =>
                                                    updateStarCondition(
                                                        stars,
                                                        {
                                                            unit: event.target
                                                                .value,
                                                        }
                                                    )
                                                }
                                                placeholder="кг, повторений…"
                                            />
                                        </div>
                                    )
                                }
                            </div>
                        );
                    })
                }

                {
                    getFieldError(errors, "starConditions") && (
                        <small className="complex-form__error">
                            {getFieldError(errors, "starConditions")}
                        </small>
                    )
                }
            </FormSection>

            <FormSection title="Дополнительно">
                <Textarea
                    id="complex-instructions"
                    label="Инструкция по выполнению (необязательно)"
                    value={complex.instructions}
                    onChange={(event) =>
                        updateField("instructions", event.target.value)
                    }
                    rows={3}
                />

                <Textarea
                    id="complex-restrictions"
                    label="Ограничения/противопоказания (необязательно)"
                    value={complex.restrictions}
                    onChange={(event) =>
                        updateField("restrictions", event.target.value)
                    }
                    rows={3}
                />
            </FormSection>

            <ActionGroup>
                <Button type="submit" variant="primary">
                    {submitLabel}
                </Button>

                <Button type="button" variant="outline" onClick={onCancel}>
                    Отмена
                </Button>
            </ActionGroup>
        </form>
    );
}
