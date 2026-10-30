import "../../styles/components/playground-draft-notice.css";

import Button from "../ui/Button/Button";

type DraftNoticeProps = {
    /** Форма открыта с восстановленным черновиком. */
    isRestored: boolean;

    /** «Начать заново» — удалить черновик и очистить форму. */
    onDiscard: () => void;

    disabled?: boolean;
};

/**
 * Строка над формой создания про черновик: либо «мы восстановили ваш
 * черновик» с кнопкой «Начать заново», либо подсказка, что введённое
 * сохраняется автоматически. Вид тот же, что у добавления площадки.
 */
export default function DraftNotice({
    isRestored,
    onDiscard,
    disabled = false,
}: DraftNoticeProps) {
    if (!isRestored) {
        return (
            <p className="playground-draft-hint">
                Введённое сохраняется автоматически как черновик на этом
                устройстве — можно закрыть страницу и вернуться позже.
            </p>
        );
    }

    return (
        <div className="playground-draft-notice" role="status">
            <p className="playground-draft-notice__text">
                Мы восстановили ваш черновик: можно продолжить с того же места.
                Он сохраняется автоматически на этом устройстве.
            </p>

            <Button variant="outline" onClick={onDiscard} disabled={disabled}>
                Начать заново
            </Button>
        </div>
    );
}
