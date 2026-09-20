import type {
    Program,
    ProgramBlock,
    ProgramDifficulty,
    ProgramScheme,
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

export type ApiProgramBlock = {
    id?: string | null;
    title: string;
    exercises: string[];
    scheme?: string | null;
    note?: string | null;
    rest?: string | null;
};

export type ApiProgramScheme = {
    id?: string | null;
    name: string;
    description?: string | null;
    blocks: ApiProgramBlock[];
    note?: string | null;
    extra_materials?: string | null;
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

function mapApiBlockToBlock(block: ApiProgramBlock): ProgramBlock {
    return {
        id: block.id || generateLocalId("block"),
        title: block.title,
        exercises: block.exercises,
        scheme: block.scheme ?? undefined,
        note: block.note ?? undefined,
        rest: block.rest ?? undefined,
    };
}

function mapApiSchemeToScheme(scheme: ApiProgramScheme): ProgramScheme {
    return {
        id: scheme.id || generateLocalId("scheme"),
        name: scheme.name,
        description: scheme.description ?? undefined,
        blocks: scheme.blocks.map(mapApiBlockToBlock),
        note: scheme.note ?? undefined,
        extraMaterials: scheme.extra_materials ?? undefined,
    };
}

function mapApiSectionToSection(section: ApiProgramSection): ProgramSection {
    return {
        id: section.id || generateLocalId("section"),
        name: section.name ?? undefined,
        schemes: section.schemes.map(mapApiSchemeToScheme),
    };
}

export function mapApiStructureToStructure(
    structure: ApiProgramStructure
): ProgramStructure {
    return {
        sections: structure.sections.map(mapApiSectionToSection),
    };
}

function mapBlockToApi(block: ProgramBlock): ApiProgramBlock {
    return {
        id: block.id,
        title: block.title,
        exercises: block.exercises,
        scheme: block.scheme || null,
        note: block.note || null,
        rest: block.rest || null,
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
