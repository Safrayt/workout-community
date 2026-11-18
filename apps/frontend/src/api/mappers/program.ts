import type {
    Program,
    ProgramBlock,
    ProgramBlockItem,
    ProgramBlockOrder,
    ProgramDifficulty,
    ProgramItemTarget,
    ProgramScheme,
    ProgramSchemeMode,
    ProgramSection,
    ProgramStructure,
    ProgramVersion,
    ProgramVersionSummary,
} from "../../types/program";
import type { NewProgram } from "../../types/newProgram";
import type { ProgramComment } from "../../types/programComment";

import { resolveMediaUrl } from "../media";

// --- Структура версии ------------------------------------------------------
//
// Единственное расхождение имён между бэкендом и фронтендом внутри
// структуры — extra_materials/extraMaterials, всё остальное уже
// однословное. id блоков/схем/разделов генерируется на фронтенде (см.
// types/program.ts) и просто хранится бэкендом, не пересчитывается.

export type ApiProgramItemTarget = {
    kind: "reps" | "seconds" | "max" | "amrap" | "emom";
    value: number;
    with_reps?: boolean;
    reps?: number | null;
};

export type ApiProgramBlockItem = {
    exercise_id: string | null;
    text: string | null;
    load?: string | null;
    target?: ApiProgramItemTarget | null;
    group_with_previous?: boolean;
    rounds?: number | null;
};

export type ApiProgramBlock = {
    id?: string | null;
    title: string;

    /** Устаревшее поле: упражнения-строки старых версий. При записи
     *  всегда пустое — всё лежит в items. */
    exercises: string[];
    items?: ApiProgramBlockItem[] | null;
    scheme?: string | null;
    note?: string | null;
    rest?: string | null;
    rounds?: number | null;
    order?: ProgramBlockOrder;
    rest_within_set?: number | null;
    rest_between_rounds?: number | null;
    rest_between_sets?: number | null;
    rest_after_block?: number | null;
    emom_together?: boolean;
};

export type ApiProgramScheme = {
    id?: string | null;
    name: string;
    description?: string | null;
    blocks: ApiProgramBlock[];
    note?: string | null;
    extra_materials?: string | null;
    mode?: ProgramSchemeMode;
};

export type ApiProgramSection = {
    id?: string | null;
    name?: string | null;
    schemes: ApiProgramScheme[];
};

export type ApiProgramStructure = {
    sections: ApiProgramSection[];
};

let localIdCounter = 0;

/** Клиентский id для новых блоков/схем/разделов, которых ещё нет на
 *  сервере — уникален в рамках одной вкладки, что и требуется для
 *  React-ключей. */
export function generateLocalId(prefix: string): string {
    localIdCounter += 1;
    return `${prefix}-${Date.now()}-${localIdCounter}`;
}

function mapApiTargetToTarget(
    target: ApiProgramItemTarget | null | undefined
): ProgramItemTarget | undefined {
    return target
        ? {
              kind: target.kind,
              value: target.value,
              withReps: target.with_reps || undefined,
              reps: target.reps ?? undefined,
          }
        : undefined;
}

function mapTargetToApi(
    target: ProgramItemTarget | undefined
): ApiProgramItemTarget | null {
    // Пока автор не ввёл число, цели нет: сервер не принимает «пустую»
    // цель, а в черновике она может быть не заполнена.
    if (!target || !target.value || target.value <= 0) {
        return null;
    }

    // Повторения за время бывают у упражнений на секунды, AMRAP и EMOM.
    // У AMRAP и EMOM повторения считаются всегда.
    const withReps =
        target.kind === "amrap" ||
        target.kind === "emom" ||
        (target.kind === "seconds" && target.withReps === true);

    return {
        kind: target.kind,
        value: target.value,
        with_reps: withReps,
        reps: withReps && target.reps && target.reps > 0 ? target.reps : null,
    };
}

function mapApiItemsToItems(block: ApiProgramBlock): ProgramBlockItem[] {
    // Версии, сохранённые до связи с базой упражнений, хранят строки в
    // exercises, а items у них пуст — показываем эти строки как «свои»
    // упражнения. Опубликованные версии неизменяемы, поэтому читаем их
    // так всегда, а не переписываем в базе.
    if (!block.items || block.items.length === 0) {
        return block.exercises.map((text) => ({ kind: "text", text }));
    }

    return block.items.flatMap((item): ProgramBlockItem[] => {
        const load = item.load || undefined;
        const auto = {
            target: mapApiTargetToTarget(item.target),
            groupWithPrevious: item.group_with_previous || undefined,
            rounds: item.rounds ?? undefined,
        };

        if (item.exercise_id) {
            return [
                {
                    kind: "exercise",
                    exerciseId: item.exercise_id,
                    load,
                    ...auto,
                },
            ];
        }

        return item.text
            ? [{ kind: "text", text: item.text, load, ...auto }]
            : [];
    });
}

function mapItemsToApiItems(items: ProgramBlockItem[]): ApiProgramBlockItem[] {
    // Пустые строки (автор добавил «своё упражнение» и не заполнил) не
    // сохраняем — сервер отклонил бы такой элемент.
    return items.flatMap((item): ApiProgramBlockItem[] => {
        const load = item.load?.trim() || null;
        const auto = {
            target: mapTargetToApi(item.target),
            group_with_previous: item.groupWithPrevious ?? false,
            rounds: item.rounds ?? null,
        };

        if (item.kind === "exercise") {
            return [
                {
                    exercise_id: item.exerciseId,
                    text: null,
                    load,
                    ...auto,
                },
            ];
        }

        const text = item.text.trim();

        return text ? [{ exercise_id: null, text, load, ...auto }] : [];
    });
}

function mapApiBlockToBlock(block: ApiProgramBlock): ProgramBlock {
    return {
        id: block.id || generateLocalId("block"),
        title: block.title,
        items: mapApiItemsToItems(block),
        scheme: block.scheme ?? undefined,
        note: block.note ?? undefined,
        rest: block.rest ?? undefined,
        rounds: block.rounds ?? undefined,
        order: block.order ?? undefined,
        restWithinSet: block.rest_within_set ?? undefined,
        restBetweenRounds: block.rest_between_rounds ?? undefined,
        restBetweenSets: block.rest_between_sets ?? undefined,
        restAfterBlock: block.rest_after_block ?? undefined,
        emomTogether: block.emom_together === true ? true : undefined,
    };
}

// Схемы и разделы без сохранённого id (старые данные) получают id по
// месту в структуре, а не случайный: на id схемы строится её адрес
// (/programs/:id/schemes/:schemeId), и он не должен меняться от
// загрузки к загрузке. Новые схемы получают настоящий id в редакторе.
function mapApiSchemeToScheme(
    scheme: ApiProgramScheme,
    fallbackId: string
): ProgramScheme {
    return {
        id: scheme.id || fallbackId,
        name: scheme.name,
        description: scheme.description ?? undefined,
        blocks: scheme.blocks.map(mapApiBlockToBlock),
        note: scheme.note ?? undefined,
        extraMaterials: scheme.extra_materials ?? undefined,
        mode: scheme.mode ?? "free",
    };
}

function mapApiSectionToSection(
    section: ApiProgramSection,
    sectionIndex: number
): ProgramSection {
    const sectionNumber = sectionIndex + 1;

    return {
        id: section.id || `section-${sectionNumber}`,
        name: section.name ?? undefined,
        schemes: section.schemes.map((scheme, schemeIndex) =>
            mapApiSchemeToScheme(
                scheme,
                `scheme-${sectionNumber}-${schemeIndex + 1}`
            )
        ),
    };
}

export function mapApiStructureToStructure(
    structure: ApiProgramStructure
): ProgramStructure {
    return {
        sections: structure.sections.map((section, index) =>
            mapApiSectionToSection(section, index)
        ),
    };
}

function mapBlockToApi(block: ProgramBlock): ApiProgramBlock {
    return {
        id: block.id,
        title: block.title,
        exercises: [],
        items: mapItemsToApiItems(block.items),
        scheme: block.scheme || null,
        note: block.note || null,
        rest: block.rest || null,
        rounds: block.rounds ?? null,
        order: block.order ?? "sequential",
        rest_within_set: block.restWithinSet ?? null,
        rest_between_rounds: block.restBetweenRounds ?? null,
        rest_between_sets: block.restBetweenSets ?? null,
        rest_after_block: block.restAfterBlock ?? null,
        emom_together: block.emomTogether === true,
    };
}

function mapSchemeToApi(scheme: ProgramScheme): ApiProgramScheme {
    return {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description || null,
        blocks: scheme.blocks.map(mapBlockToApi),
        note: scheme.note || null,
        extra_materials: scheme.extraMaterials || null,
        mode: scheme.mode ?? "free",
    };
}

function mapSectionToApi(section: ProgramSection): ApiProgramSection {
    return {
        id: section.id,
        name: section.name || null,
        schemes: section.schemes.map(mapSchemeToApi),
    };
}

export function mapStructureToApi(
    structure: ProgramStructure
): ApiProgramStructure {
    return {
        sections: structure.sections.map(mapSectionToApi),
    };
}

// --- Программа --------------------------------------------------------

export type ApiProgram = {
    id: number;
    title: string;
    description: string;
    cover_url?: string | null;
    difficulty?: ProgramDifficulty | null;
    author_id: number;
    author_nickname: string;
    author_avatar_url?: string | null;
    is_published: boolean;
    current_version_id?: number | null;
    trainings_count: number;
    favorites_count: number;
    is_favorited_by_viewer: boolean;
    created_at: string;
    updated_at: string;
};

export function mapApiProgramToProgram(apiProgram: ApiProgram): Program {
    return {
        id: String(apiProgram.id),
        title: apiProgram.title,
        description: apiProgram.description,
        coverUrl: resolveMediaUrl(apiProgram.cover_url ?? undefined),
        difficulty: apiProgram.difficulty ?? undefined,
        authorId: String(apiProgram.author_id),
        authorNickname: apiProgram.author_nickname,
        authorAvatarUrl: resolveMediaUrl(
            apiProgram.author_avatar_url ?? undefined
        ),
        isPublished: apiProgram.is_published,
        currentVersionId:
            apiProgram.current_version_id !== null &&
            apiProgram.current_version_id !== undefined
                ? String(apiProgram.current_version_id)
                : undefined,
        trainingsCount: apiProgram.trainings_count,
        favoritesCount: apiProgram.favorites_count,
        isFavoritedByViewer: apiProgram.is_favorited_by_viewer,
        createdAt: apiProgram.created_at,
        updatedAt: apiProgram.updated_at,
    };
}

export function mapNewProgramToApi(
    program: Pick<NewProgram, "title" | "description" | "difficulty">
): Record<string, unknown> {
    return {
        title: program.title,
        description: program.description,
        difficulty: program.difficulty || null,
    };
}

// --- Версия -------------------------------------------------------------

export type ApiProgramVersion = {
    id: number;
    program_id: number;
    status: "draft" | "published";
    version_number?: string | null;
    changelog?: string | null;
    structure: ApiProgramStructure;
    created_at: string;
    updated_at: string;
    published_at?: string | null;
};

export function mapApiVersionToVersion(
    apiVersion: ApiProgramVersion
): ProgramVersion {
    return {
        id: String(apiVersion.id),
        programId: String(apiVersion.program_id),
        status: apiVersion.status,
        versionNumber: apiVersion.version_number ?? undefined,
        changelog: apiVersion.changelog ?? undefined,
        structure: mapApiStructureToStructure(apiVersion.structure),
        createdAt: apiVersion.created_at,
        updatedAt: apiVersion.updated_at,
        publishedAt: apiVersion.published_at ?? undefined,
    };
}

export type ApiProgramVersionSummary = {
    id: number;
    version_number?: string | null;
    changelog?: string | null;
    published_at?: string | null;
};

export function mapApiVersionSummaryToSummary(
    apiSummary: ApiProgramVersionSummary
): ProgramVersionSummary {
    return {
        id: String(apiSummary.id),
        versionNumber: apiSummary.version_number ?? undefined,
        changelog: apiSummary.changelog ?? undefined,
        publishedAt: apiSummary.published_at ?? undefined,
    };
}

// --- Комментарии ---------------------------------------------------------

export type ApiProgramComment = {
    id: number;
    program_id: number;
    user_id: number;
    text: string;
    created_at: string;
};

export function mapApiProgramCommentToComment(
    apiComment: ApiProgramComment
): ProgramComment {
    return {
        id: String(apiComment.id),
        programId: String(apiComment.program_id),
        userId: String(apiComment.user_id),
        text: apiComment.text,
        createdAt: apiComment.created_at,
    };
}
