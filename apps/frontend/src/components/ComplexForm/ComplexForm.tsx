import { useMemo, useState } from "react";

import FormSection from "../ui/FormSection/FormSection";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import TagBadge from "../ui/TagBadge/TagBadge";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import SchemeBuilder from "../SchemeBuilder/SchemeBuilder";
import { AutoSchemeEditor } from "../ProgramStructureEditor/ProgramStructureEditor";
import ComplexSchemeView from "../ComplexSchemeView/ComplexSchemeView";

import "../../styles/components/complex-form.css";

import type { ValidationError } from "../../validation";
import { validateComplex } from "../../validation/complex";
import { getFieldError } from "../../utils/validation.ts";

import { complexTypeFilterOptions, metricLabels } from "../../constants/complexTypes";
import { movementTypeLabels } from "../../constants/movementTypes";
import { useExercises } from "../../context/ExerciseContext";
import type { MetricType, MovementType } from "../../types/complex";
import type { NewComplex } from "../../types/newComplex";

/**
 * Что означает каждый показатель результата — для подсказки в форме.
 * autoText — как его считает помощник (только у комплексов со схемой для
 * помощника). Правило сравнения участников — то же, что в рейтинге
 * (routers/complexes.py, _leaderboard_metric).
 */
const metricHelp: {
    metric: MetricType;
    text: string;
    autoText?: string;
}[] = [
    {
        metric: "time",
        text: "Сколько времени ушло на весь комплекс. Чем меньше, тем лучше.",
        autoText:
            "С помощником подставляется само: от старта до финиша, вместе с отдыхом.",
    },
    {
        metric: "reps",
        text: "Сколько всего повторений сделано во всех упражнениях. Чем больше, тем лучше.",
        autoText:
            "С помощником считается само: складываются повторения, «максимум», а также повторения, отмеченные в AMRAP и EMOM. Упражнения на секунды без отметки повторений в сумму не входят.",
    },
    {
        metric: "sets",
        text: "Сколько подходов выполнено. Вводится вручную. Чем больше, тем лучше.",
    },
    {
        metric: "rounds",
        text: "Сколько кругов выполнено, например «сколько кругов успеете за отведённое время». Вводится вручную. Чем больше, тем лучше.",
    },
    {
        metric: "duration",
        text: "Сколько человек выполнял задание, например держал планку: минуты и секунды, вводится вручную и обязательно. В рейтинге чем дольше, тем лучше — противоположность «Времени».",
    },
    {
        metric: "count",
        text: "Любое число, смысл которого задаёте вы: очки, вес, расстояние. Вводится вручную. Чем больше, тем лучше.",
    },
];

const metricOptions = (Object.keys(metricLabels) as MetricType[]).map(
    (value) => ({ value, label: metricLabels[value] })
);

type ComplexFormProps = {
    initialValue: NewComplex;

    submitLabel: string;

    /** true при редактировании — id уже существующей записи не меняется. */
    isEditing?: boolean;

    onSubmit: (complex: NewComplex) => void;

    onCancel: () => void;

    /**
     * Прежний текст схемы у комплекса, заведённого до структурированной
     * схемы (при редактировании) — подсказка, что собрать из блоков.
     */
    legacySchemeText?: string;
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
    legacySchemeText,
}: ComplexFormProps) {
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [complex, setComplex] = useState<NewComplex>(initialValue);

    const { getExerciseById } = useExercises();

    // Типы движения комплекса — типы движения упражнений схемы (в
    // порядке первого появления). Администратор их не выбирает: сервер
    // выводит их сам, здесь они только показываются как подсказка.
    const derivedMovements = useMemo(() => {
        const result: MovementType[] = [];

        const exerciseIds = complex.autoScheme
            ? complex.autoScheme.blocks.flatMap((block) =>
                  block.items.flatMap((item) =>
                      item.kind === "exercise" ? [item.exerciseId] : []
                  )
              )
            : complex.scheme.flatMap((block) =>
                  block.items.map((item) => item.exerciseId)
              );

        for (const exerciseId of exerciseIds) {
            const movementType = getExerciseById(exerciseId)?.movementType;

            if (movementType && !result.includes(movementType)) {
                result.push(movementType);
            }
        }

        return result;
    }, [complex.autoScheme, complex.scheme, getExerciseById]);

    // Переход со старого конструктора на новый (как у программ): схема
    // собирается заново, а старая при сохранении заменяется.
    function switchToAutoScheme() {
        const confirmed = window.confirm(
            "Перейти на новый конструктор схемы?\n\n" +
                "Схему придётся собрать заново: старая останется только до " +
                "сохранения, после него она заменяется новой."
        );

        if (!confirmed) return;

        updateField("autoScheme", {
            id: "complex-scheme",
            name: complex.name,
            mode: "auto",
            blocks: [],
        });
    }

    function updateField<K extends keyof NewComplex>(
        field: K,
        value: NewComplex[K]
    ) {
        setComplex((current) => ({ ...current, [field]: value }));
        setErrors((current) => current.filter((error) => error.field !== field));
    }

    function toggleListValue<K extends "types" | "resultMetrics">(
        field: K,
        value: NewComplex[K][number]
    ) {
        setComplex((current) => {
            // Приведение к string[] — TypeScript не может сопоставить
            // типы внутри тела дженерика, объединяющего два разных по
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

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const result = validateComplex(complex, { isEditing });

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);
        onSubmit(complex);
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

            <FormSection title="Тип движения">
                <p className="complex-form__hint">
                    Определяется автоматически по упражнениям схемы — выбирать его
                    не нужно. По нему комплекс находится в фильтре каталога.
                </p>
                <p className="complex-form__movements">
                    {
                        derivedMovements.length > 0
                            ? derivedMovements
                                .map((movement) => movementTypeLabels[movement])
                                .join(" · ")
                            : "Появится, когда в схему добавят упражнения."
                    }
                </p>
            </FormSection>

            <FormSection title="Схема комплекса">
                {
                    complex.autoScheme ? (
                        <>
                            <AutoSchemeEditor
                                scheme={complex.autoScheme}
                                onChange={(autoScheme) =>
                                    updateField("autoScheme", autoScheme)
                                }
                            />

                            {
                                getFieldError(errors, "scheme") && (
                                    <small className="complex-form__error">
                                        Схема заполнена не полностью — смотрите
                                        список выше.
                                    </small>
                                )
                            }
                        </>
                    ) : (
                        <>
                            {
                                legacySchemeText && (
                                    <p className="complex-form__legacy">
                                        Раньше схема была записана текстом: <em>{legacySchemeText}</em>.
                                        Соберите её заново из блоков и упражнений базы.
                                    </p>
                                )
                            }

                            <p className="complex-form__hint">
                                Это прежний конструктор схем: по такому
                                комплексу нет помощника с таймерами.
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={switchToAutoScheme}
                            >
                                Перейти на новый конструктор (с помощником)
                            </Button>

                            <SchemeBuilder
                                value={complex.scheme}
                                onChange={(scheme) => updateField("scheme", scheme)}
                                errors={errors
                                    .filter((error) => error.field === "scheme")
                                    .map((error) => error.message)}
                            />
                        </>
                    )
                }

                <Textarea
                    id="complex-scheme-note"
                    label="Пояснение к схеме (необязательно)"
                    value={complex.schemeNote}
                    onChange={(event) => updateField("schemeNote", event.target.value)}
                    placeholder="Например: отдыхать внутри минуты можно, но время не останавливается."
                    rows={2}
                />

                {
                    !complex.autoScheme &&
                    complex.scheme.some((block) => block.items.length > 0) && (
                        <div className="complex-form__preview">
                            <h4 className="complex-form__preview-title">
                                Так схема будет выглядеть на странице комплекса
                            </h4>

                            <ComplexSchemeView
                                scheme={complex.scheme.filter((block) => block.items.length > 0)}
                                note={complex.schemeNote}
                                resultMetrics={complex.resultMetrics}
                                linkExercises={false}
                            />
                        </div>
                    )
                }
            </FormSection>

            <FormSection title="Показатели результата">
                <div className="complex-form__hint">
                    <p>
                        Отметьте, что считается результатом комплекса: по
                        каждому отмеченному показателю участник вносит значение
                        при выполнении.
                        {
                            complex.autoScheme &&
                                " При прохождении с помощником «Время» и «Повторения» подставляются сами, остальные показатели участник вводит на экране завершения."
                        }
                    </p>

                    <ul className="complex-form__metric-help">
                        {
                            metricHelp.map((help) => (
                                <li key={help.metric}>
                                    <strong>{metricLabels[help.metric]}</strong>
                                    {" — "}
                                    {help.text}
                                    {
                                        complex.autoScheme && help.autoText &&
                                            ` ${help.autoText}`
                                    }
                                </li>
                            ))
                        }
                    </ul>

                    <p>
                        Как сравниваются участники в таблице результатов: если
                        отмечено «Время», выше тот, у кого оно меньше. Если
                        «Времени» нет, но есть «Продолжительность», выше тот,
                        кто выполнял дольше. Иначе — по первому показателю,
                        который вы отметили (чем больше, тем выше). Остальные
                        показатели сохраняются вместе с выполнением, но места
                        не определяют.
                    </p>
                </div>

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
                    label="Обратить внимание: ограничения, противопоказания (необязательно)"
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
