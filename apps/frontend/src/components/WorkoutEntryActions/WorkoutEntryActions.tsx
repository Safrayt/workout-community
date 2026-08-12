import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";

type Props = {

    isOwner: boolean;

    onEdit: () => void;

    onDelete: () => void;

};

/**
 * Действия над записью (UX-DIARY-ENTRY §19, §22).
 *
 * Доступны только владельцу записи — "Редактировать" и "Удалить"
 * (danger-вариант, визуально вторичный). Для чужой публичной
 * записи блок вовсе не рендерится: такая запись — только для
 * чтения.
 */
export default function WorkoutEntryActions({
    isOwner,
    onEdit,
    onDelete,
}: Props) {

    if (!isOwner) {
        return null;
    }

    return (

        <ActionGroup>

            <Button
                variant="primary"
                onClick={onEdit}
            >
                Редактировать
            </Button>

            <Button
                variant="danger"
                onClick={onDelete}
            >
                Удалить
            </Button>

        </ActionGroup>

    );

}
