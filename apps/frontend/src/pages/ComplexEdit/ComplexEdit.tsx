import { useNavigate, useParams } from "react-router-dom";

import ComplexForm from "../../components/ComplexForm/ComplexForm";

import "../../styles/components/complex-form-page.css";

import type { Complex } from "../../types/complex";
import type { NewComplex } from "../../types/newComplex";

import { useComplexes } from "../../context/ComplexContext";

function complexToFormValue(complex: Complex): NewComplex {
    return {
        id: complex.id,
        name: complex.name,
        types: complex.types,
        description: complex.description,
        schemeDisplay: complex.schemeDisplay,
        schemeSteps: complex.schemeSteps ?? null,
        totalReps: complex.totalReps ?? null,
        movements: complex.movements,
        exercise: complex.exercise,
        resultMetrics: complex.resultMetrics,
        starConditions: complex.starConditions,
        instructions: complex.instructions ?? "",
        restrictions: complex.restrictions ?? "",
    };
}

export default function ComplexEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getComplexById, isLoading, editComplex } = useComplexes();

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

    return (
        <div className="complex-form-page">
            <h1 className="complex-form-page__title">
                Редактирование: {complexDef.name}
            </h1>

            <ComplexForm
                initialValue={complexToFormValue(complexDef)}
                submitLabel="Сохранить"
                isEditing
                onSubmit={handleSubmit}
                onCancel={() => navigate(`/complexes/${complexDef.id}`)}
            />
        </div>
    );
}
