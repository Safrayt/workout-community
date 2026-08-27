import type { DiaryRecordType } from "../../types/diaryRecord";
import type { SystemFeedRecordType } from "../../types/systemFeedRecord";

import "../../styles/components/diary-record-type-badge.css";

type Props = {

    type: DiaryRecordType | SystemFeedRecordType;

};

const LABELS: Record<DiaryRecordType | SystemFeedRecordType, string> = {
    workout: "Тренировка",
    note: "Заметка",
    event_created: "Событие",
    playground_created: "Новая площадка",
};

/**
 * Тренировки и заметки должны различаться мгновенно, но не слишком
 * резко — иконка/маркер + текст, разные второстепенные цвета
 * (UX-DIARY-V2 §9).
 */
export default function DiaryRecordTypeBadge({
    type,
}: Props) {
    return (
        <span
            className={`diary-record-type-badge diary-record-type-badge--${type}`}
        >
            <span
                className="diary-record-type-badge__dot"
                aria-hidden="true"
            />

            {LABELS[type]}
        </span>
    );
}
