import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ComplexForm from "../../components/ComplexForm/ComplexForm";
import Button from "../../components/ui/Button/Button";
import FormSection from "../../components/ui/FormSection/FormSection";

import "../../styles/components/complex-form-page.css";

import type { Complex } from "../../types/complex";
import type { NewComplex } from "../../types/newComplex";
import { createEmptySchemeBlock, type SchemeBlock } from "../../types/complexScheme";

import { useComplexes } from "../../context/ComplexContext";

/**
 * Схема для формы. У комплекса со схемой — она сама. У комплекса,
 * заведённого раньше (только список упражнений или только текст), —
 * заготовка: один блок с его упражнениями без нагрузки (нагрузку
 * администратор задаёт сам; форма не даст сохранить без неё) либо пустой
 * блок.
 */
function schemeForForm(complex: Complex): SchemeBlock[] {
    if (complex.scheme.length > 0) {
        return complex.scheme;
    }

    const block = createEmptySchemeBlock();

    block.items = complex.exerciseIds.map((exerciseId) => ({
        exerciseId,
        reps: null,
        maxEffort: false,
        durationSeconds: null,
        repsStep: 0,
        repsLimit: null,
        note: null,
    }));

    return [block];
}

function complexToFormValue(complex: Complex): NewComplex {
    return {
        id: complex.id,
        name: complex.name,
        types: complex.types,
        description: complex.description,
        scheme: schemeForForm(complex),
        schemeNote: complex.schemeNote ?? "",
        resultMetrics: complex.resultMetrics,
        instructions: complex.instructions ?? "",
        restrictions: complex.restrictions ?? "",
    };
}

export default function ComplexEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getComplexById, isLoading, editComplex, removeComplex } = useComplexes();
    const [isDeleting, setIsDeleting] = useState(false);

    const complexDef = id ? getComplexById(id) : undefined;

    if (isLoading) {
        return (
            <div className="complex-form-page">
                <p>Загрузка…</p>
            </div>
        );
    }

    if (!complexDef) {
        return (
            <div className="complex-form-page">
                <p>Комплекс не найден.</p>
            </div>
        );
    }

    async function handleSubmit(complex: NewComplex) {
        try {
            await editComplex(complexDef!.id, complex);
            navigate(`/complexes/${complexDef!.id}`);
        } catch (error: unknown) {
            console.error("Не удалось сохранить комплекс:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "Не удалось сохранить комплекс. Попробуйте ещё раз.";

            window.alert(message);
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            `Удалить комплекс «${complexDef!.name}»?\n\n` +
                "Вместе с ним навсегда удалятся результаты его выполнения " +
                "у всех пользователей и все комментарии к нему. " +
                "Это действие нельзя отменить."
        );

        if (!confirmed) return;

        setIsDeleting(true);

        try {
            await removeComplex(complexDef!.id);
            navigate("/complexes");
        } catch (error: unknown) {
            console.error("Не удалось удалить комплекс:", error);

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Не удалось удалить комплекс. Попробуйте ещё раз."
            );
            setIsDeleting(false);
        }
    }

    return (
        <div className="complex-form-page">
            <h1 className="complex-form-page__title">
                Редактирование: {complexDef.name}
            </h1>

            <ComplexForm
                initialValue={complexToFormValue(complexDef)}
                // У комплекса без структурированной схемы — прежний текст
                // как подсказка, что собрать из блоков.
                legacySchemeText={
                    complexDef.scheme.length === 0
                        ? [complexDef.schemeDisplay, complexDef.exercise]
                              .filter(Boolean)
                              .join(" — ")
                        : undefined
                }
                submitLabel="Сохранить"
                isEditing
                onSubmit={handleSubmit}
                onCancel={() => navigate(`/complexes/${complexDef.id}`)}
            />

            {
                // «Опасная зона» — в самом низу и отдельно от формы, чтобы
                // удаление нельзя было нажать по соседству с «Сохранить».
            }
            <div className="complex-form-page__danger">
                <FormSection title="Опасная зона">
                    <div className="complex-form-page__warning" role="alert">
                        <p className="complex-form-page__warning-title">
                            Удаление необратимо
                        </p>

                        <p className="complex-form-page__warning-text">
                            Вместе с комплексом будут удалены:
                        </p>

                        <ul className="complex-form-page__warning-list">
                            <li>сам комплекс и его страница — ссылки на неё перестанут работать;</li>
                            <li>результаты выполнения комплекса у всех пользователей;</li>
                            <li>все комментарии к комплексу.</li>
                        </ul>
                    </div>

                    <div className="complex-form-page__notice">
                        Записи в дневниках пользователей останутся — пропадёт только
                        привязанный к ним результат этого комплекса.
                    </div>

                    <Button
                        type="button"
                        variant="danger"
                        disabled={isDeleting}
                        onClick={handleDelete}
                    >
                        {isDeleting ? "Удаляем…" : "Удалить комплекс"}
                    </Button>
                </FormSection>
            </div>
        </div>
    );
}
