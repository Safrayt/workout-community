import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type { PersonalTag } from "../types/personalTag";

import {
    createPersonalTag,
    deletePersonalTag,
    listPersonalTags,
    renamePersonalTag,
} from "../api/diary";

import { ApiError } from "../api/errors";

import { useWorkoutDiary } from "./WorkoutDiaryContext";
import { useDiaryNotes } from "./DiaryNotesContext";

import { normalizeTagName } from "../utils/personalTags";

type MutationResult =
    | { success: true }
    | { success: false; error: string };

type PersonalTagsContextType = {
    tags: PersonalTag[];

    createTag: (
        userId: string,
        name: string
    ) => Promise<MutationResult>;

    renameTag: (
        id: string,
        name: string
    ) => Promise<MutationResult>;

    deleteTag: (id: string) => Promise<void>;

    /**
     * На бэкенде теги, использованные в записи/заметке, уже
     * регистрируются в личном каталоге сами (см. _sync_personal_tags
     * в routers/diary.py) в момент создания/изменения записи. Поэтому
     * здесь достаточно просто перечитать список тегов с сервера —
     * сама регистрация уже случилась. Сигнатура (userId, tagNames)
     * сохранена ради WorkoutEntryForm/DiaryNoteForm, которые вызывают
     * эту функцию без изменений — переданные значения не используются.
     */
    registerUsedTags: (
        userId: string,
        tagNames: string[]
    ) => void;
};

const PersonalTagsContext =
    createContext<PersonalTagsContextType | undefined>(undefined);


export function PersonalTagsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { refreshEntries } = useWorkoutDiary();
    const { refreshNotes } = useDiaryNotes();

    const [tags, setTags] = useState<PersonalTag[]>([]);

    async function refreshTags(): Promise<void> {
        const fetched = await listPersonalTags();
        setTags(fetched);
    }

    useEffect(() => {
        listPersonalTags()
            .then(setTags)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить личные теги:",
                    error
                );
            });
    }, []);


    function registerUsedTags() {
        refreshTags().catch((error: unknown) => {
            console.error(
                "Не удалось обновить список тегов:",
                error
            );
        });
    }


    async function createTag(
        _userId: string,
        name: string
    ): Promise<MutationResult> {
        const trimmed = normalizeTagName(name);

        try {
            const created = await createPersonalTag(trimmed);

            setTags((current) => [...current, created]);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof ApiError
                        ? error.message
                        : "Не удалось создать тег. Попробуйте ещё раз.",
            };
        }
    }


    async function renameTag(
        id: string,
        name: string
    ): Promise<MutationResult> {
        const trimmed = normalizeTagName(name);

        try {
            const renamed = await renamePersonalTag(id, trimmed);

            setTags((current) =>
                current.map((tag) => (tag.id === id ? renamed : tag))
            );

            // Переименование каскадно правит tags у записей/заметок на
            // бэкенде (см. _rename_tag_everywhere) — локальный кеш
            // entries/notes об этом сам не узнает, перечитываем.
            await Promise.all([refreshEntries(), refreshNotes()]);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof ApiError
                        ? error.message
                        : "Не удалось переименовать тег. Попробуйте ещё раз.",
            };
        }
    }


    async function deleteTag(id: string): Promise<void> {
        await deletePersonalTag(id);

        setTags((current) => current.filter((tag) => tag.id !== id));

        await Promise.all([refreshEntries(), refreshNotes()]);
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
    const context = useContext(PersonalTagsContext);

    if (!context) {
        throw new Error(
            "usePersonalTags must be used inside PersonalTagsProvider"
        );
    }

    return context;
}
