import { useId, useState } from "react";

import Input from "../ui/Input/Input";
import Button from "../ui/Button/Button";
import TagBadge from "../ui/TagBadge/TagBadge";

import { MAX_USER_TAGS } from "../../utils/workoutTags";

type TagsFieldProps = {

    tags: string[];

    /** Личный справочник тегов пользователя (см. PersonalTagsContext). */
    existingTags: string[];

    maxTags: number;

    onChange: (tags: string[]) => void;

    label?: string;

};

/**
 * Поле выбора тегов — быстрые плашки уже использованных тегов плюс
 * свободный ввод нового. Общий для формы тренировки и формы заметки
 * (UX-DIARY-V2 §5 "Теги").
 */
export default function TagsField({
    tags,
    existingTags,
    maxTags,
    onChange,
    label = "Личные теги",
}: TagsFieldProps) {
    const datalistId = useId();

    const [tagInput, setTagInput] =
        useState("");

    const [tagError, setTagError] =
        useState<string | null>(null);

    const availableExistingTags =
        existingTags.filter(
            (tag) => !tags.includes(tag)
        );

    function addTag() {
        const trimmed = tagInput.trim();

        if (trimmed.length === 0) {
            return;
        }

        if (tags.includes(trimmed)) {
            setTagInput("");
            return;
        }

        if (tags.length >= maxTags) {
            setTagError(
                `Можно добавить не более ${maxTags} тегов.`
            );

            return;
        }

        if (
            !existingTags.includes(trimmed) &&
            existingTags.length >= MAX_USER_TAGS
        ) {
            setTagError(
                `Достигнут лимит в ${MAX_USER_TAGS} личных тегов. Выберите один из уже созданных.`
            );

            return;
        }

        onChange([...tags, trimmed]);

        setTagInput("");
        setTagError(null);
    }

    function addExistingTag(tag: string) {
        if (tags.includes(tag)) {
            return;
        }

        if (tags.length >= maxTags) {
            setTagError(
                `Можно добавить не более ${maxTags} тегов.`
            );

            return;
        }

        onChange([...tags, tag]);
        setTagError(null);
    }

    function removeTag(tag: string) {
        onChange(
            tags.filter(
                (item) => item !== tag
            )
        );
    }

    return (
        <div className="input">
            <label className="input__label">
                {`${label} (${tags.length}/${maxTags})`}
            </label>

            {
                availableExistingTags.length > 0 && (
                    <div className="workout-entry-tag-suggestions">
                        <p className="workout-entry-tag-suggestions__label">
                            Ваши теги — нажмите, чтобы прикрепить
                        </p>

                        <div className="tag-list">
                            {
                                availableExistingTags.map(
                                    (tag) => (
                                        <TagBadge
                                            key={tag}
                                            label={tag}
                                            onClick={() =>
                                                addExistingTag(tag)
                                            }
                                        />
                                    )
                                )
                            }
                        </div>
                    </div>
                )
            }

            <div className="tag-input-row">
                <Input
                    list={datalistId}
                    placeholder="Например, турник"
                    value={tagInput}
                    onChange={(e) =>
                        setTagInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                />

                <datalist id={datalistId}>
                    {
                        existingTags.map(
                            (tag) => (
                                <option
                                    key={tag}
                                    value={tag}
                                />
                            )
                        )
                    }
                </datalist>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={addTag}
                >
                    Добавить
                </Button>
            </div>

            {
                tagError && (
                    <small className="input__error">
                        {tagError}
                    </small>
                )
            }

            {
                tags.length > 0 && (
                    <div className="tag-list">
                        {
                            tags.map(
                                (tag) => (
                                    <TagBadge
                                        key={tag}
                                        label={tag}
                                        onRemove={() =>
                                            removeTag(tag)
                                        }
                                    />
                                )
                            )
                        }
                    </div>
                )
            }
        </div>
    );
}
