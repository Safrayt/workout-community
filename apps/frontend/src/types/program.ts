export type ProgramDifficulty = "beginner" | "intermediate" | "advanced";

export type ProgramVersionStatus = "draft" | "published";

/**
 * Блок — минимальная структурированная часть схемы (см. UX-документ
 * «Раздел Программы», п.12-17). В интерфейсе называется "Комплекс" —
 * то же самое поле структуры, просто более привычное тренирующимся
 * слово; имя типа/поля на фронтенде и бэкенде не меняем. Название
 * обязательно, всё остальное — свободный текст автора, который
 * фронтенд никак не разбирает и не анализирует.
 */
export type ProgramBlock = {
    /** Клиентский id для стабильных React-ключей при редактировании
     *  порядка — на бэкенде не осмысливается, просто хранится. */
    id: string;

    title: string;

    /** Порядок элементов этого списка — и есть порядок выполнения,
     *  который увидят пользователи (п.15). */
    exercises: string[];

    /** "Схема / описание выполнения блока" (п.16), например "5 × 10". */
    scheme?: string;

    note?: string;

    /** Отдых между подходами/комплексами — свободный текст автора,
     *  например "60-90 секунд" или "полное восстановление". */
    rest?: string;
};

export type ProgramScheme = {
    id: string;

    name: string;

    description?: string;

    blocks: ProgramBlock[];

    note?: string;

    /** "Дополнительные материалы" (п.11) — ссылка/текст. */
    extraMaterials?: string;
};

/**
 * Раздел — необязательный уровень вложенности (п.10). Когда автор не
 * использует разделы, вся структура хранится как один раздел с
 * name=undefined — на экране такой раздел не показывается отдельным
 * заголовком, см. ProgramStructureView/ProgramStructureEditor.
 */
export type ProgramSection = {
    id: string;

    name?: string;

    schemes: ProgramScheme[];
};

export type ProgramStructure = {
    sections: ProgramSection[];
};

export type ProgramVersion = {
    id: string;

    programId: string;

    status: ProgramVersionStatus;

    versionNumber?: string;

    changelog?: string;

    structure: ProgramStructure;

    createdAt: string;

    updatedAt: string;

    publishedAt?: string;
};

/** Для истории версий (без структуры целиком, см. п.4.1 документа). */
export type ProgramVersionSummary = {
    id: string;

    versionNumber?: string;

    changelog?: string;

    publishedAt?: string;
};

/**
 * Программа из каталога — приходит с GET /programs. Автор — любой
 * зарегистрированный пользователь (в отличие от Complex, который
 * ведёт только администратор), поэтому здесь есть поля об авторе.
 */
export type Program = {
    id: string;

    title: string;

    description: string;

    coverUrl?: string;

    difficulty?: ProgramDifficulty;

    authorId: string;

    authorNickname: string;

    authorAvatarUrl?: string;

    /** Есть ли хотя бы одна опубликованная версия (п.3 документа) —
     *  пока false, программа видна только автору. */
    isPublished: boolean;

    currentVersionId?: string;

    trainingsCount: number;

    favoritesCount: number;

    isFavoritedByViewer: boolean;

    createdAt: string;

    updatedAt: string;
};
