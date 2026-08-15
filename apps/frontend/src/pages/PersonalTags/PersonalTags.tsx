import { Link } from "react-router-dom";

import { useState } from "react";

import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import PersonalTagItem from "../../components/PersonalTagItem/PersonalTagItem";

import "../../styles/components/personal-tags.css";

import {
    usePersonalTags,
} from "../../context/PersonalTagsContext";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    sortTagsByUsage,
    filterTagsBySearch,
    getTagUsageCount,
} from "../../utils/personalTags";

import {
    MAX_PERSONAL_TAGS,
} from "../../constants/personalTags";

/**
 * "Мои теги" (/profile/tags) — управление личным справочником
 * тегов пользователя (UX-PERSONAL-TAGS). Намеренно простая
 * страница: счётчик, поиск, создание, компактный список с инлайн-
 * редактированием — без отдельной "карточки" на каждый тег (§29).
 */
export default function PersonalTags() {
    const {
        tags,
        createTag,
        renameTag,
        deleteTag,
    } = usePersonalTags();

    const {
        entries,
    } = useWorkoutDiary();

    const {
        notes,
    } = useDiaryNotes();

    const {
        currentUser,
    } = useCurrentUser();

    const [search, setSearch] =
        useState("");

    const [isCreating, setIsCreating] =
        useState(false);

    const [newTagName, setNewTagName] =
        useState("");

    const [createError, setCreateError] =
        useState<string | null>(null);

    const userTags = tags.filter(
        (tag) => tag.userId === currentUser.id
    );

    const sortedTags = sortTagsByUsage(
        userTags,
        entries,
        notes,
        currentUser.id
    );

    const visibleTags = filterTagsBySearch(
        sortedTags,
        search
    );

    const isAtLimit =
        userTags.length >= MAX_PERSONAL_TAGS;

    function openCreateForm() {
        setNewTagName("");
        setCreateError(null);
        setIsCreating(true);
    }

    function closeCreateForm() {
        setIsCreating(false);
        setCreateError(null);
    }

    function submitCreateForm() {
        const result = createTag(
            currentUser.id,
            newTagName
        );

        if (!result.success) {
            // Введённые данные не исчезают при ошибке (UX §34).
            setCreateError(result.error);
            return;
        }

        setIsCreating(false);
        setNewTagName("");
        setCreateError(null);
    }

    return (
        <div className="personal-tags">

            {/* Header (UX §5) */}
            <Link
                to="/profile"
                className="personal-tags__back"
            >
                ← Профиль
            </Link>

            <header className="personal-tags__header">
                <h1 className="personal-tags__title">
                    Мои теги
                </h1>

                <p className="personal-tags__description">
                    Управляйте тегами, которыми вы отмечаете свои тренировки.
                </p>
            </header>

            {/* Tags Overview (UX §6, §7, §10) */}
            <div className="personal-tags__overview">
                <p className="personal-tags__counter">
                    {userTags.length} из {MAX_PERSONAL_TAGS}
                </p>

                <Button
                    type="button"
                    onClick={openCreateForm}
                >
                    + Создать тег
                </Button>
            </div>

            {
                isCreating && (
                    <div className="personal-tags__create-form">
                        {
                            isAtLimit ? (
                                <>
                                    <p className="personal-tags__limit-title">
                                        Достигнут лимит тегов
                                    </p>

                                    <p className="personal-tags__limit-description">
                                        Вы можете удалить ненужный тег, чтобы создать новый.
                                    </p>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={closeCreateForm}
                                    >
                                        Понятно
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Input
                                        label="Название"
                                        placeholder="Например, подтягивания"
                                        autoFocus
                                        value={newTagName}
                                        error={createError ?? undefined}
                                        onChange={(e) => {
                                            setNewTagName(e.target.value);
                                            setCreateError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                submitCreateForm();
                                            }

                                            if (e.key === "Escape") {
                                                closeCreateForm();
                                            }
                                        }}
                                    />

                                    <div className="personal-tags__create-actions">
                                        <Button
                                            type="button"
                                            onClick={submitCreateForm}
                                        >
                                            Создать
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={closeCreateForm}
                                        >
                                            Отмена
                                        </Button>
                                    </div>
                                </>
                            )
                        }
                    </div>
                )
            }

            {
                userTags.length === 0 ? (
                    /* Empty State (UX §27) */
                    <div className="personal-tags-empty-state">
                        <p className="personal-tags-empty-state__title">
                            У вас пока нет личных тегов.
                        </p>

                        <p className="personal-tags-empty-state__description">
                            Создайте тег, чтобы отмечать им свои тренировочные записи.
                        </p>

                        <Button
                            type="button"
                            onClick={openCreateForm}
                        >
                            + Создать тег
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Search (UX §14–15) */}
                        <Input
                            aria-label="Поиск по тегам"
                            placeholder="Поиск по тегам..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {
                            visibleTags.length === 0 ? (
                                /* Empty Search State (UX §28) */
                                <div className="personal-tags-empty-state">
                                    <p className="personal-tags-empty-state__title">
                                        Ничего не найдено
                                    </p>

                                    <p className="personal-tags-empty-state__description">
                                        Нет тегов, соответствующих запросу.
                                    </p>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setSearch("")}
                                    >
                                        Очистить поиск
                                    </Button>
                                </div>
                            ) : (
                                <ul className="personal-tags-list">
                                    {
                                        visibleTags.map((tag) => (
                                            <PersonalTagItem
                                                key={tag.id}
                                                tag={tag}
                                                usageCount={
                                                    getTagUsageCount(
                                                        entries,
                                                        notes,
                                                        currentUser.id,
                                                        tag.name
                                                    )
                                                }
                                                onRename={renameTag}
                                                onDelete={deleteTag}
                                            />
                                        ))
                                    }
                                </ul>
                            )
                        }
                    </>
                )
            }

        </div>
    );
}
