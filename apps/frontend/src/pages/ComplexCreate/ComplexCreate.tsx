import { useNavigate } from "react-router-dom";

import ComplexForm from "../../components/ComplexForm/ComplexForm";

import "../../styles/components/complex-form-page.css";

import { EMPTY_NEW_COMPLEX, type NewComplex } from "../../types/newComplex";

import { useComplexes } from "../../context/ComplexContext";

export default function ComplexCreate() {
    const navigate = useNavigate();
    const { addComplex } = useComplexes();

    async function handleSubmit(complex: NewComplex) {
        try {
            const created = await addComplex(complex);
            navigate(`/complexes/${created.id}`);
        } catch (error: unknown) {
            console.error("Не удалось создать комплекс:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "Не удалось создать комплекс. Попробуйте ещё раз.";

            window.alert(message);
        }
    }

    return (
        <div className="complex-form-page">
            <h1 className="complex-form-page__title">Новый комплекс</h1>

            <ComplexForm
                initialValue={EMPTY_NEW_COMPLEX}
                submitLabel="Создать"
                onSubmit={handleSubmit}
                onCancel={() => navigate("/complexes")}
            />
        </div>
    );
}
