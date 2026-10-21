import { Link } from "react-router-dom";

import "../../styles/components/playground-inspection.css";

import type { Playground } from "../../types/playground";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useAuth } from "../../context/CurrentUserContext";

import { useLoginRedirect } from "../../hooks/useLoginRedirect";

import { formatDate } from "../../utils/formatDate";
import { getInspectionStatus } from "../../utils/playgroundInspection";
import { getLastVerification } from "../../utils/playgroundHistory";

import Button from "../ui/Button/Button";
import UserLink from "../UserLink/UserLink";

type Props = {
    playground: Playground;

    onEdit: () => void;
};

const promptText: Record<string, string> = {

    neverInspected:
        "Эту площадку ещё никто не проверял. Если вы здесь тренируетесь — подтвердите, что информация верна, или поправьте, что изменилось.",

    changedSinceInspection:
        "Информация о площадке менялась после последней проверки. Загляните на площадку и подтвердите, что всё указано верно.",

    stale:
        "Последняя проверка была давно — данные могли устареть. Если вы недавно здесь тренировались, подтвердите актуальность.",

};

/**
 * Инлайн-текст "дата · @ник" + ссылка на полную историю —
 * для использования внутри InfoRow.
 */
export function InspectionSummary({
    playground,
}: {
    playground: Playground;
}) {
    const lastVerification = getLastVerification(playground);

    return (
        <span className="playground-inspection-summary">
            <span>
                {
                    lastVerification
                        ? (
                            <>
                                {formatDate(lastVerification.date)}
                                {" · "}
                                <UserLink username={lastVerification.username} />
                            </>
                        )
                        : "Ещё не проверялась"
                }
            </span>

            <Link
                to={`/playgrounds/${playground.id}/history`}
                className="playground-inspection-summary__link"
            >
                История
            </Link>
        </span>
    );
}

/**
 * Блочная плашка-предложение провести проверку. Рендерится вне
 * InfoRow (как и предупреждение об ограничениях доступа) —
 * это не строка с данными, а самостоятельный призыв к действию.
 */
export default function PlaygroundInspectionPrompt({
    playground,
    onEdit,
}: Props) {
    const { confirmPlaygroundInspection } = usePlaygrounds();
    const { user } = useAuth();
    const goToLogin = useLoginRedirect();

    const status = getInspectionStatus(playground);

    if (
        status === "upToDate"
    ) {
        return null;
    }

    function handleConfirm() {
        // Подтверждать актуальность может только вошедший; гостю без
        // этого кнопка молча ничего бы не делала (сервер ответит 401).
        if (!user) {
            goToLogin();

            return;
        }

        confirmPlaygroundInspection(playground.id).catch(
            (error: unknown) => {
                console.error(
                    "Не удалось подтвердить актуальность площадки:",
                    error
                );
            }
        );
    }

    return (
        <div className="playground-inspection-prompt">
            <p className="playground-inspection-prompt__text">
                {promptText[status]}
            </p>

            <div className="playground-inspection-prompt__actions">
                <Button
                    variant="secondary"
                    onClick={handleConfirm}
                >
                    Всё верно
                </Button>

                <Button
                    variant="outline"
                    onClick={onEdit}
                >
                    Внести изменения
                </Button>
            </div>
        </div>
    );
}
