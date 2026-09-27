import { useRef } from "react";

import "../../../styles/components/Textarea.css";
import "../../../styles/components/RichTextarea.css";

type MarkupKind = "bold" | "italic" | "underline" | "link";

type RichTextareaProps = {
    error?: string;

    id: string;

    label: string;

    placeholder?: string;

    value: string;

    onChange: (value: string) => void;

    rows?: number;
};

/**
 * Как Textarea, но с панелью кнопок форматирования сверху —
 * оборачивает выделенный в textarea текст в лёгкую разметку
 * (**жирный**, *курсив*, __подчёркнутый__, [ссылка](url)), которую
 * при показе разбирает utils/richText.tsx (см. renderRichText).
 *
 * Намеренно отдельный компонент, а не доработка общего Textarea —
 * панель формата нужна не везде (заголовки, короткие поля вроде
 * названия площадки её не используют), а раздувать самый массовый
 * компонент формы ради двух-трёх мест не хочется.
 *
 * Текст, как и раньше, хранится обычной строкой (никаких изменений
 * схемы БД) — кнопки просто вставляют символы разметки в то же поле,
 * что и раньше принимало обычный plain text.
 */
export default function RichTextarea({
    error,
    id,
    label,
    placeholder,
    value,
    onChange,
    rows = 4,
}: RichTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function applyMarkup(kind: MarkupKind) {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.slice(start, end);

        let before = "";
        let after = "";
        let placeholderText = "";

        if (kind === "bold") {
            before = "**";
            after = "**";
            placeholderText = "жирный текст";
        } else if (kind === "italic") {
            before = "*";
            after = "*";
            placeholderText = "курсив";
        } else if (kind === "underline") {
            before = "__";
            after = "__";
            placeholderText = "подчёркнутый текст";
        } else {
            // Ссылке отдельно нужен URL — спрашиваем сразу, чтобы не
            // городить отдельное всплывающее окошко ради одного поля.
            const url = window.prompt("Ссылка (URL):", "https://");

            if (!url || !url.trim()) {
                return;
            }

            before = "[";
            after = `](${url.trim()})`;
            placeholderText = "текст ссылки";
        }

        const inner = selected || placeholderText;
        const insertion = `${before}${inner}${after}`;

        const nextValue =
            value.slice(0, start) + insertion + value.slice(end);

        onChange(nextValue);

        // textarea обновится значением из пропа только после
        // перерисовки — ставим курсор/выделение уже поверх свежего
        // DOM, иначе setSelectionRange отработает по старому,
        // более короткому тексту.
        requestAnimationFrame(() => {
            textarea.focus();

            const selectionStart = start + before.length;
            const selectionEnd = selectionStart + inner.length;

            textarea.setSelectionRange(selectionStart, selectionEnd);
        });
    }

    return (
        <div className="textarea-field">
            <label
                htmlFor={id}
                className="textarea-label"
            >
                {label}
            </label>

            <div
                className="rich-textarea__toolbar"
                role="toolbar"
                aria-label="Форматирование текста"
            >
                <button
                    type="button"
                    className="rich-textarea__toolbar-button rich-textarea__toolbar-button--bold"
                    title="Жирный текст"
                    aria-label="Жирный текст"
                    onClick={() => applyMarkup("bold")}
                >
                    Ж
                </button>

                <button
                    type="button"
                    className="rich-textarea__toolbar-button rich-textarea__toolbar-button--italic"
                    title="Курсив"
                    aria-label="Курсив"
                    onClick={() => applyMarkup("italic")}
                >
                    К
                </button>

                <button
                    type="button"
                    className="rich-textarea__toolbar-button rich-textarea__toolbar-button--underline"
                    title="Подчёркнутый текст"
                    aria-label="Подчёркнутый текст"
                    onClick={() => applyMarkup("underline")}
                >
                    Ч
                </button>

                <button
                    type="button"
                    className="rich-textarea__toolbar-button"
                    title="Вставить ссылку"
                    aria-label="Вставить ссылку"
                    onClick={() => applyMarkup("link")}
                >
                    🔗
                </button>
            </div>

            <textarea
                ref={textareaRef}
                id={id}
                className={[
                    "textarea-input",
                    error &&
                        "textarea-input--error",
                ]
                    .filter(Boolean)
                    .join(" ")}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={rows}
                aria-invalid={!!error}
            />

            {
                error && (
                    <small className="textarea-error">
                        {error}
                    </small>
                )
            }
        </div>
    );
}
