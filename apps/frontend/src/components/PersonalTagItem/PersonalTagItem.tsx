import { useState } from "react";

import Input from "../ui/Input/Input";
import Button from "../ui/Button/Button";

import type { PersonalTag } from "../../types/personalTag";

import { pluralizeRu } from "../../utils/pluralize";

import "../../styles/components/personal-tag-item.css";

type MutationResult =
    | { success: true }
    | { success: false; error: string };

type PersonalTagItemProps = {

    tag: PersonalTag;

    usageCount: number;

    onRename: (id: string, name: string) => MutationResult;

    onDelete: (id: string) => void;

};

/**
 * Компактная строка тега, а не большая карточка — при 50 тегах
 * карточки растянули бы страницу до неприличия (UX-PERSONAL-TAGS
 * §29). Редактирование происходит на месте, без перехода на другой
 * экран (§19).
 */
export default function PersonalTagItem({
    tag,
    usageCount,
    onRename,
    onDelete,
}: PersonalTagItemProps) {
    const [isEditing, setIsEditing] =
        useState(false);

    const [draftName, setDraftName] =
        useState(tag.name);

    const [error, setError] =
        useState<string | null>(null);

    function startEditing() {
        setDraftName(tag.name);
        setError(null);
        setIsEditing(true);
    }

    function cancelEditing() {
        setIsEditing(false);
        setError(null);
    }

    function saveEditing() {
        const result = onRename(tag.id, draftName);

        if (!result.success) {
            // Введённые данные не исчезают при ошибке (UX §34).
            setError(result.error);
            return;
        }

        setIsEditing(false);
        setError(null);
    }

    function handleDelete() {
        const message =
            usageCount > 0
                ? `Удалить тег «${tag.name}»?\n\nЭтот тег используется в ${usageCount} ${
                    pluralizeRu(usageCount, ["тренировке", "тренировках", "тренировках"])
                }. Удаление уберёт его из этих записей. Сами тренировки останутся.`
                : `Удалить тег «${tag.name}»?`;

        const confirmed = window.confirm(message);

        if (confirmed) {
            onDelete(tag.id);
        }
    }

    if (isEditing) {
        return (
            <li className="personal-tag-item personal-tag-item--editing">
                <div className="personal-tag-item__edit-form">
                    <Input
                        aria-label="Название тега"
                        autoFocus
                        value={draftName}
                        error={error ?? undefined}
                        onChange={(e) => {
                            setDraftName(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                saveEditing();
                            }

                            if (e.key === "Escape") {
                                cancelEditing();
                            }
                        }}
                    />

                    <div className="personal-tag-item__edit-actions">
                        <Button
                            type="button"
                            onClick={saveEditing}
                        >
                            Сохранить
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={cancelEditing}
                        >
                            Отмена
                        </Button>
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li className="personal-tag-item">
            <div className="personal-tag-item__info">
                <span className="personal-tag-item__name">
                    {tag.name}
                </span>

                <span className="personal-tag-item__usage">
                    {usageCount} {
                        pluralizeRu(usageCount, ["тренировка", "тренировки", "тренировок"])
                    }
                </span>
            </div>

            <div className="personal-tag-item__actions">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={startEditing}
                >
                    Редактировать
                </Button>

                <Button
                    type="button"
                    variant="danger"
                    onClick={handleDelete}
                >
                    Удалить
                </Button>
            </div>
        </li>
    );
}
