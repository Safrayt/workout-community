import type { DiaryRecordType } from "../../types/diaryRecord";

import "../../styles/components/diary-record-type-badge.css";

type Props = {

    type: DiaryRecordType;

};

const LABELS: Record<DiaryRecordType, string> = {
    workout: "Тренировка",
    note: "Заметка",
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
