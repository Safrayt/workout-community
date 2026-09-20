import { useState } from "react";

import FormSection from "../ui/FormSection/FormSection";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Select from "../ui/Select/Select";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import ProgramCoverUpload from "../ProgramCoverUpload/ProgramCoverUpload";

import "../../styles/components/program-form.css";

import type { ValidationError } from "../../validation";
import { validateProgram } from "../../validation/program";
import { getFieldError } from "../../utils/validation";

import { programDifficultyFilterOptions } from "../../constants/programTypes";
import type { ProgramDifficulty } from "../../types/program";
import type { NewProgram } from "../../types/newProgram";

type ProgramFormProps = {
    initialValue: NewProgram;

    submitLabel: string;

    onSubmit: (program: NewProgram) => void;

    onCancel: () => void;
};

/**
 * Форма "информации о программе" (см. UX-документ «Раздел
 * Программы», п.2) — название/описание/обложка/сложность. Структуру
 * версии (схемы/блоки/упражнения) эта форма не трогает — за неё
 * отвечает ProgramStructureEditor на странице редактирования.
 */
export default function ProgramForm({
    initialValue,
    submitLabel,
    onSubmit,
    onCancel,
}: ProgramFormProps) {
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [program, setProgram] = useState<NewProgram>(initialValue);

    function updateField<K extends keyof NewProgram>(
        field: K,
        value: NewProgram[K]
    ) {
        setProgram((current) => ({ ...current, [field]: value }));
        setErrors((current) => current.filter((error) => error.field !== field));
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const result = validateProgram(program);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);
        onSubmit(program);
    }

    return (
        <form className="program-form" onSubmit={handleSubmit}>
            <FormSection title="Основное">
                <Input
                    id="program-title"
                    label="Название программы"
                    value={program.title}
                    onChange={(event) =>
                        updateField("title", event.target.value)
                    }
                    error={getFieldError(errors, "title")}
                />

                <Textarea
                    id="program-description"
                    label="Описание (необязательно)"
                    value={program.description}
                    onChange={(event) =>
                        updateField("description", event.target.value)
                    }
                    rows={4}
                />

                <Select
                    id="program-difficulty"
                    label="Сложность (необязательно)"
                    value={program.difficulty ?? ""}
                    onChange={(event) =>
                        updateField(
                            "difficulty",
                            (event.target.value || undefined) as
                                | ProgramDifficulty
                                | undefined
                        )
                    }
                    options={programDifficultyFilterOptions}
                    emptyOptionLabel="Не указана"
                />
            </FormSection>

            <FormSection title="Обложка">
                <ProgramCoverUpload
                    coverUrl={program.coverUrl ?? ""}
                    onChange={(coverUrl) =>
                        updateField("coverUrl", coverUrl || undefined)
                    }
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
