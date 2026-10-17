import { useId, useState } from "react";

import Input from "../ui/Input/Input";
import Button from "../ui/Button/Button";
import TagBadge from "../ui/TagBadge/TagBadge";

import type { ArticleTagCount } from "../../types/article";

import {
    MAX_ARTICLE_TAGS,
    normalizeArticleTag,
} from "../../utils/articleTags";

/** Сколько частых тегов показывать плашками под полем. */
const MAX_SUGGESTIONS = 12;

type ArticleTagsFieldProps = {
    tags: string[];

    /** Хештеги, которые уже есть у опубликованных статей. */
    suggestions: ArticleTagCount[];

    onChange: (tags: string[]) => void;
};

/**
 * Поле хештегов статьи: свободный ввод плюс плашки уже существующих
 * тегов — выбирать готовый проще и не плодит дубли вроде "подтягивания"
 * и "подтягивание". Введённое приводится к виду, который хранит сервер
 * (нижний регистр, слова через дефис, см. normalizeArticleTag).
 */
export default function ArticleTagsField({
    tags,
    suggestions,
    onChange,
}: ArticleTagsFieldProps) {
    const datalistId = useId();

    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const availableSuggestions = suggestions.filter(
        (suggestion) => !tags.includes(suggestion.tag)
    );

    function addTag(raw: string) {
        // Пустое поле — не ошибка (например, ушли из поля, ничего не
        // введя).
        if (raw.trim().replace(/^#+/, "").trim() === "") {
            setInput("");
            setError(null);
            return;
        }

        const result = normalizeArticleTag(raw);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        if (tags.includes(result.tag)) {
            setInput("");
            setError(null);
            return;
        }

        if (tags.length >= MAX_ARTICLE_TAGS) {
            setError(`Можно добавить не более ${MAX_ARTICLE_TAGS} хештегов`);
            return;
        }

        onChange([...tags, result.tag]);
        setInput("");
        setError(null);
    }

    function removeTag(tag: string) {
        onChange(tags.filter((item) => item !== tag));
    }

    return (
        <div className="input">
            <label className="input__label" htmlFor={`${datalistId}-input`}>
                {`Хештеги (${tags.length}/${MAX_ARTICLE_TAGS})`}
            </label>

            <div className="tag-input-row">
                <Input
                    id={`${datalistId}-input`}
                    list={datalistId}
                    placeholder="Например, подтягивания"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                            event.preventDefault();
                            addTag(input);
                        }
                    }}
                    // Недописанный тег не теряется, если сразу нажать
                    // "Опубликовать": кнопка забирает фокус и поле
                    // добавляет его само.
                    onBlur={() => {
                        if (input.trim() !== "") {
                            addTag(input);
                        }
                    }}
                />

                <datalist id={datalistId}>
                    {suggestions.map((suggestion) => (
                        <option key={suggestion.tag} value={suggestion.tag} />
                    ))}
                </datalist>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addTag(input)}
                >
                    Добавить
                </Button>
            </div>

            {error && <small className="input__error">{error}</small>}

            {tags.length > 0 && (
                <div className="tag-list">
                    {tags.map((tag) => (
                        <TagBadge
                            key={tag}
                            label={`#${tag}`}
                            onRemove={() => removeTag(tag)}
                        />
                    ))}
                </div>
            )}

            {availableSuggestions.length > 0 && (
                <div className="workout-entry-tag-suggestions">
                    <p className="workout-entry-tag-suggestions__label">
                        Уже используются — нажмите, чтобы добавить
                    </p>

                    <div className="tag-list">
                        {availableSuggestions
                            .slice(0, MAX_SUGGESTIONS)
                            .map((suggestion) => (
                                <TagBadge
                                    key={suggestion.tag}
                                    label={`#${suggestion.tag}`}
                                    onClick={() => addTag(suggestion.tag)}
                                />
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
