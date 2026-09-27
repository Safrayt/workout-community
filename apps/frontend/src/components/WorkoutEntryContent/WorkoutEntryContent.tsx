import "../../styles/components/workout-entry-content.css";

import { renderRichText } from "../../utils/richText";

type Props = {

    description?: string;

};

/**
 * Главный блок страницы — текст записи (UX-DIARY-ENTRY §11–13).
 *
 * Это должно читаться как личный дневник, а не как форма: крупный
 * комфортный текст, увеличенный межстрочный интервал, ограниченная
 * ширина строки. Если описания нет — блок не рендерится вовсе,
 * без подписи "Описание:" и пустого места под ней (§13).
 *
 * Поддерживает лёгкую разметку — **жирный**, *курсив*,
 * __подчёркнутый__, [ссылки](url) (расставляется через
 * RichTextToolbar в форме или руками) — и по-прежнему делает
 * кликабельными обычные "голые" ссылки без разметки. См.
 * utils/richText.tsx.
 */
export default function WorkoutEntryContent({
    description,
}: Props) {

    if (!description) {
        return null;
    }

    return (

        <div className="workout-entry-content">
            {renderRichText(description)}
        </div>

    );

}
