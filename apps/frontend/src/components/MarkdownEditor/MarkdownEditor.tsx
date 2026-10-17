import { useRef, useState, type ChangeEvent, type ReactNode } from "react";

import CollapsibleSection from "../ui/CollapsibleSection/CollapsibleSection";
import ViewSwitch from "../ViewSwitch/ViewSwitch";
import LazyMarkdownContent from "../MarkdownContent/LazyMarkdownContent";

import "../../styles/components/markdown-editor.css";

import { MAX_ARTICLE_BODY_LENGTH } from "../../utils/articleForm";
import { prepareArticleImage } from "../../utils/articleImages";
import {
    insertBlock,
    insertLink,
    normalizeLinkUrl,
    toggleBulletList,
    toggleHeading,
    toggleNumberedList,
    toggleQuote,
    wrapSelection,
    type TextEdit,
} from "../../utils/markdownEdit";

type EditorMode = "write" | "preview";

const MODE_OPTIONS = [
    { value: "write", label: "Редактор" },
    { value: "preview", label: "Предпросмотр" },
] as const;

const IMAGE_ALT_PLACEHOLDER = "описание картинки";

type MarkdownEditorProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;

    /**
     * Загружает картинку на сервер и возвращает её адрес, который
     * редактор вставит в текст (см. uploadArticleImage в api/articles.ts).
     */
    onUploadImage: (file: File) => Promise<string>;

    error?: string;
    rows?: number;
};

type ToolbarButtonProps = {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
};

function ToolbarButton({
    title,
    onClick,
    disabled = false,
    className = "",
    children,
}: ToolbarButtonProps) {
    return (
        <button
            type="button"
            className={`markdown-editor__tool ${className}`.trim()}
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

/**
 * Редактор текста статьи в Markdown: поле ввода, панель кнопок
 * (заголовки, выделение, списки, цитата, ссылка, картинка) и вкладка
 * предпросмотра. Текст хранится обычной Markdown-строкой — кнопки лишь
 * вставляют символы разметки в то же поле, поэтому можно писать и
 * руками.
 *
 * Картинка загружается на сервер сразу при выборе файла, а в текст
 * попадает ссылка на неё: ![описание](адрес).
 */
export default function MarkdownEditor({
    id,
    label,
    value,
    onChange,
    onUploadImage,
    error,
    rows = 22,
}: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<EditorMode>("write");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Поле остаётся в странице и в режиме предпросмотра (просто
    // скрыто), поэтому правки по кнопкам работают от текущего
    // содержимого поля, а не от значения, "застрявшего" в замыкании на
    // время долгой загрузки картинки.
    function applyEdit(
        edit: (text: string, start: number, end: number) => TextEdit
    ) {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        const result = edit(
            textarea.value,
            textarea.selectionStart,
            textarea.selectionEnd
        );

        onChange(result.value);

        // Выделение ставим уже после перерисовки, иначе оно
        // отработает по старому, более короткому тексту.
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(
                result.selectionStart,
                result.selectionEnd
            );
        });
    }

    function handleLink() {
        const raw = window.prompt("Адрес ссылки (URL):", "https://");
        const url = raw === null ? null : normalizeLinkUrl(raw);

        // "https://" — это подсказка из окошка, которую так и не
        // дописали.
        if (!url || url === "https://") {
            return;
        }

        applyEdit((text, start, end) => insertLink(text, start, end, url));
    }

    async function handleImagePicked(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        // Сброс позволяет выбрать тот же файл ещё раз.
        event.target.value = "";

        if (!file) {
            return;
        }

        setUploadError(null);
        setIsUploading(true);

        try {
            const prepared = await prepareArticleImage(file);
            const url = await onUploadImage(prepared);

            const block = `![${IMAGE_ALT_PLACEHOLDER}](${url})`;

            // Выделяем описание — его сразу можно заменить своим.
            applyEdit((text, start, end) =>
                insertBlock(text, start, end, block, [
                    2,
                    2 + IMAGE_ALT_PLACEHOLDER.length,
                ])
            );
        } catch (uploadFailure: unknown) {
            console.error("Не удалось загрузить картинку:", uploadFailure);

            setUploadError(
                uploadFailure instanceof Error
                    ? uploadFailure.message
                    : "Не удалось загрузить картинку"
            );
        } finally {
            setIsUploading(false);
        }
    }

    const isNearLimit = value.length > MAX_ARTICLE_BODY_LENGTH * 0.9;

    // Подсказка про Markdown для тех, кто видит его впервые.
    const cheatSheet = (
        <CollapsibleSection title="Подсказка по разметке">
            <div className="markdown-editor__help">
                <p>
                    Название статьи вводится отдельным полем, поэтому в тексте
                    начинайте с заголовков второго уровня (<code>##</code>).
                    Абзацы разделяются пустой строкой.
                </p>

                <pre>{`## Заголовок раздела
### Заголовок поменьше

**жирный**, *курсив*, [текст ссылки](https://…)

- пункт списка
- ещё пункт

1. первый шаг
2. второй шаг

> цитата

| Упражнение | Повторы |
|------------|---------|
| Подтягивания | 5×5 |`}</pre>

                <p>
                    <strong>Видео:</strong> вставьте обычную ссылку на ролик,
                    например <code>[Смотреть разбор](https://youtu.be/…)</code>{" "}
                    — она откроется в новой вкладке.
                </p>

                <p>
                    <strong>Картинки</strong> добавляются кнопкой «Картинка»:
                    файл загружается на сайт, а в текст вставляется ссылка на
                    него. Картинки с других сайтов вставить нельзя.
                </p>
            </div>
        </CollapsibleSection>
    );

    return (
        <div className="markdown-editor">
            <label htmlFor={id} className="markdown-editor__label">
                {label}
            </label>

            <ViewSwitch
                options={MODE_OPTIONS}
                value={mode}
                onChange={setMode}
                ariaLabel="Режим редактора"
            />

            <div hidden={mode !== "write"}>
                <div
                    className="markdown-editor__toolbar"
                    role="toolbar"
                    aria-label="Форматирование текста"
                >
                    <ToolbarButton
                        title="Заголовок раздела"
                        onClick={() =>
                            applyEdit((text, start, end) =>
                                toggleHeading(text, start, end, 2)
                            )
                        }
                    >
                        H2
                    </ToolbarButton>

                    <ToolbarButton
                        title="Подзаголовок"
                        onClick={() =>
                            applyEdit((text, start, end) =>
                                toggleHeading(text, start, end, 3)
                            )
                        }
                    >
                        H3
                    </ToolbarButton>

                    <ToolbarButton
                        title="Жирный текст"
                        className="markdown-editor__tool--bold"
                        onClick={() =>
                            applyEdit((text, start, end) =>
                                wrapSelection(
                                    text,
                                    start,
                                    end,
                                    "**",
                                    "**",
                                    "жирный текст"
                                )
                            )
                        }
                    >
                        Ж
                    </ToolbarButton>

                    <ToolbarButton
                        title="Курсив"
                        className="markdown-editor__tool--italic"
                        onClick={() =>
                            applyEdit((text, start, end) =>
                                wrapSelection(
                                    text,
                                    start,
                                    end,
                                    "*",
                                    "*",
                                    "курсив"
                                )
                            )
                        }
                    >
                        К
                    </ToolbarButton>

                    <ToolbarButton
                        title="Маркированный список"
                        onClick={() => applyEdit(toggleBulletList)}
                    >
                        • Список
                    </ToolbarButton>

                    <ToolbarButton
                        title="Нумерованный список"
                        onClick={() => applyEdit(toggleNumberedList)}
                    >
                        1. Список
                    </ToolbarButton>

                    <ToolbarButton
                        title="Цитата"
                        onClick={() => applyEdit(toggleQuote)}
                    >
                        Цитата
                    </ToolbarButton>

                    <ToolbarButton title="Ссылка" onClick={handleLink}>
                        Ссылка
                    </ToolbarButton>

                    <ToolbarButton
                        title="Вставить картинку"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? "Загрузка…" : "Картинка"}
                    </ToolbarButton>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="markdown-editor__file-input"
                        onChange={handleImagePicked}
                    />
                </div>

                <textarea
                    id={id}
                    ref={textareaRef}
                    className={
                        "markdown-editor__textarea" +
                        (error ? " markdown-editor__textarea--error" : "")
                    }
                    value={value}
                    rows={rows}
                    spellCheck
                    aria-invalid={!!error}
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>

            {mode === "preview" && (
                <div className="markdown-editor__preview">
                    {value.trim() ? (
                        <LazyMarkdownContent source={value} />
                    ) : (
                        <p className="markdown-editor__preview-empty">
                            Здесь появится текст статьи, каким его увидят
                            читатели.
                        </p>
                    )}
                </div>
            )}

            <div className="markdown-editor__footer">
                {uploadError ? (
                    <small className="markdown-editor__error" role="alert">
                        {uploadError}
                    </small>
                ) : (
                    <span />
                )}

                <small
                    className={
                        "markdown-editor__counter" +
                        (isNearLimit
                            ? " markdown-editor__counter--warning"
                            : "")
                    }
                >
                    {`${value.length.toLocaleString("ru-RU")} / ${MAX_ARTICLE_BODY_LENGTH.toLocaleString("ru-RU")}`}
                </small>
            </div>

            {error && (
                <small className="markdown-editor__error" role="alert">
                    {error}
                </small>
            )}

            {cheatSheet}
        </div>
    );
}
