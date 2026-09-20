import { useNavigate } from "react-router-dom";

import ProgramForm from "../../components/ProgramForm/ProgramForm";

import "../../styles/components/program-form-page.css";

import { EMPTY_NEW_PROGRAM, type NewProgram } from "../../types/newProgram";

import { usePrograms } from "../../context/ProgramContext";

/**
 * Создаёт программу и сразу ведёт автора в редактор структуры её
 * черновика — по сценарию из UX-документа (п.20: "Создание программы
 * → Черновик → Редактирование"), без промежуточного экрана.
 */
export default function ProgramCreate() {
    const navigate = useNavigate();
    const { createProgram } = usePrograms();

    async function handleSubmit(program: NewProgram) {
        try {
            const created = await createProgram(program);
            navigate(`/programs/${created.id}/edit`);
        } catch (error: unknown) {
            console.error("Не удалось создать программу:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "Не удалось создать программу. Попробуйте ещё раз.";

            window.alert(message);
        }
    }

    return (
        <div className="program-form-page">
            <h1 className="program-form-page__title">Новая программа</h1>

            <ProgramForm
                initialValue={EMPTY_NEW_PROGRAM}
                submitLabel="Создать и перейти к структуре"
                onSubmit={handleSubmit}
                onCancel={() => navigate("/programs")}
            />
        </div>
    );
}
