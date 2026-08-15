import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type { PersonalTag } from "../types/personalTag";
import type { WorkoutEntry } from "../types/workoutEntry";
import type { DiaryNote } from "../types/diaryNote";

import {
    useWorkoutDiary,
} from "./WorkoutDiaryContext";

import {
    useDiaryNotes,
} from "./DiaryNotesContext";

import {
    MAX_PERSONAL_TAGS,
} from "../constants/personalTags";

import {
    normalizeTagName,
} from "../utils/personalTags";

import {
    validateTagName,
} from "../validation/personalTag";

type MutationResult =
    | { success: true }
    | { success: false; error: string };

type PersonalTagsContextType = {
    tags: PersonalTag[];

    createTag: (
        userId: string,
        name: string
    ) => MutationResult;

    renameTag: (
        id: string,
        name: string
    ) => MutationResult;

    deleteTag: (
        id: string
    ) => void;

    /**
     * Регистрирует теги записи дневника как личные теги, если они
     * ещё не зарегистрированы — например, когда тег был свободно
     * введён прямо в форме записи (см. WorkoutEntryForm), минуя эту
     * страницу. Так "Мои теги" не расходится со списком тегов,
     * реально используемых в дневнике (UX-PERSONAL-TAGS §39, §47).
     */
    registerUsedTags: (
        userId: string,
        tagNames: string[]
    ) => void;
};

const PersonalTagsContext =
    createContext<PersonalTagsContextType | undefined>(undefined);

function addMissingTags(
    current: PersonalTag[],
    userId: string,
    tagNames: string[]
): PersonalTag[] {
    const existingKeys = new Set(
        current
            .filter((tag) => tag.userId === userId)
            .map((tag) => tag.name.toLowerCase())
    );

    const additions: PersonalTag[] = [];

    tagNames.forEach((tagName) => {
        const key = tagName.toLowerCase();

        if (existingKeys.has(key)) {
            return;
        }

        existingKeys.add(key);

        additions.push({
            id: crypto.randomUUID(),
            userId,
            name: tagName,
            createdAt: new Date().toISOString(),
        });
    });

    return additions.length > 0
        ? [...current, ...additions]
        : current;
}

function buildInitialTags(
    entries: WorkoutEntry[],
    notes: DiaryNote[]
): PersonalTag[] {
    let tags: PersonalTag[] = [];

    entries.forEach((entry) => {
        tags = addMissingTags(
            tags,
            entry.userId,
            entry.tags ?? []
        );
    });

    notes.forEach((note) => {
        tags = addMissingTags(
            tags,
            note.userId,
            note.tags ?? []
        );
    });

    return tags;
}

export function PersonalTagsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const {
        entries,
        renameTagInEntries,
        removeTagFromEntries,
    } = useWorkoutDiary();

    const {
        notes,
        renameTagInNotes,
        removeTagFromNotes,
    } = useDiaryNotes();

    // Единоразовый посев из уже существующих записей при монтировании.
    // Дальнейшая синхронизация — через registerUsedTags, вызываемую
    // явно в момент сохранения записи (см. WorkoutEntryForm), а не
    // через useEffect: setState внутри эффекта на каждое изменение
    // entries создавало бы лишний каскад ре-рендеров.
    const [tags, setTags] =
        useState<PersonalTag[]>(
            () => buildInitialTags(entries, notes)
        );

    function registerUsedTags(
        userId: string,
        tagNames: string[]
    ) {
        if (tagNames.length === 0) {
            return;
        }

        setTags(
            (current) => addMissingTags(current, userId, tagNames)
        );
    }

    function createTag(
        userId: string,
        name: string
    ): MutationResult {
        const trimmed = normalizeTagName(name);

        const error = validateTagName(
            trimmed,
            tags,
            userId
        );

        if (error) {
            return { success: false, error };
        }

        const userTagsCount = tags.filter(
            (tag) => tag.userId === userId
        ).length;

        if (userTagsCount >= MAX_PERSONAL_TAGS) {
            return {
                success: false,
                error: `Достигнут лимит тегов. Вы можете удалить ненужный тег, чтобы создать новый.`,
            };
        }

        setTags(
            (current) => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    userId,
                    name: trimmed,
                    createdAt: new Date().toISOString(),
                },
            ]
        );

        return { success: true };
    }

    function renameTag(
        id: string,
        name: string
    ): MutationResult {
        const tag = tags.find(
            (item) => item.id === id
        );

        if (!tag) {
            return { success: false, error: "Тег не найден." };
        }

        const trimmed = normalizeTagName(name);

        const error = validateTagName(
            trimmed,
            tags,
            tag.userId,
            id
        );

        if (error) {
            return { success: false, error };
        }

        setTags(
            (current) =>
                current.map(
                    (item) =>
                        item.id === id
                            ? { ...item, name: trimmed }
                            : item
                )
        );

        if (trimmed !== tag.name) {
            renameTagInEntries(
                tag.userId,
                tag.name,
                trimmed
            );

            renameTagInNotes(
                tag.userId,
                tag.name,
                trimmed
            );
        }

        return { success: true };
    }

    function deleteTag(id: string) {
        const tag = tags.find(
            (item) => item.id === id
        );

        if (!tag) {
            return;
        }

        setTags(
            (current) =>
                current.filter(
                    (item) => item.id !== id
                )
        );

        removeTagFromEntries(
            tag.userId,
            tag.name
        );

        removeTagFromNotes(
            tag.userId,
            tag.name
        );
    }

    return (
        <PersonalTagsContext.Provider
            value={{
                tags,
                createTag,
                renameTag,
                deleteTag,
                registerUsedTags,
            }}
        >
            {children}
        </PersonalTagsContext.Provider>
    );
}

export function usePersonalTags() {
    const context = useContext(
        PersonalTagsContext
    );

    if (!context) {
        throw new Error(
            "usePersonalTags must be used inside PersonalTagsProvider"
        );
    }

    return context;
}
