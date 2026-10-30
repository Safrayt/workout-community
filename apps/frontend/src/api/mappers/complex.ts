import type {
    Complex,
    ComplexType,
    MetricType,
    MovementType,
} from "../../types/complex";
import type { ComplexComment } from "../../types/complexComment";
import type { ComplexCompletion } from "../../types/complexCompletion";
import type { ComplexLeaderboard } from "../../types/complexLeaderboard";
import type { SchemeBlock, SchemeItem } from "../../types/complexScheme";
import type { NewComplex } from "../../types/newComplex";
import type { NewComplexCompletion } from "../../types/newComplexCompletion";

// --- Схема ---------------------------------------------------------------

export type ApiSchemeItem = {
    exercise_id: string;
    reps?: number | null;
    max_effort?: boolean;
    duration_seconds?: number | null;
    reps_step?: number;
    reps_limit?: number | null;
    note?: string | null;
};

export type ApiSchemeBlock = {
    title?: string | null;
    rounds?: number | null;
    rounds_kind?: "rounds" | "sets";
    rest_between_items_seconds?: number | null;
    rest_between_rounds_seconds?: number | null;
    time_limit_seconds?: number | null;
    items?: ApiSchemeItem[];
};

function mapApiSchemeItem(item: ApiSchemeItem): SchemeItem {
    return {
        exerciseId: item.exercise_id,
        reps: item.reps ?? null,
        maxEffort: item.max_effort ?? false,
        durationSeconds: item.duration_seconds ?? null,
        repsStep: item.reps_step ?? 0,
        repsLimit: item.reps_limit ?? null,
        note: item.note ?? null,
    };
}

export function mapApiSchemeBlock(block: ApiSchemeBlock): SchemeBlock {
    return {
        title: block.title ?? null,
        // null — осмысленное значение («сколько успеете»), поэтому
        // подставляем 1 только когда поля нет вовсе.
        rounds: block.rounds === undefined ? 1 : block.rounds,
        roundsKind: block.rounds_kind ?? "rounds",
        restBetweenItemsSeconds: block.rest_between_items_seconds ?? null,
        restBetweenRoundsSeconds: block.rest_between_rounds_seconds ?? null,
        timeLimitSeconds: block.time_limit_seconds ?? null,
        items: (block.items ?? []).map(mapApiSchemeItem),
    };
}

function mapSchemeItemToApi(item: SchemeItem): ApiSchemeItem {
    return {
        exercise_id: item.exerciseId,
        reps: item.reps,
        max_effort: item.maxEffort,
        duration_seconds: item.durationSeconds,
        reps_step: item.repsStep,
        reps_limit: item.repsLimit,
        note: item.note?.trim() || null,
    };
}

function mapSchemeBlockToApi(block: SchemeBlock): ApiSchemeBlock {
    return {
        title: block.title?.trim() || null,
        rounds: block.rounds,
        rounds_kind: block.roundsKind,
        rest_between_items_seconds: block.restBetweenItemsSeconds,
        rest_between_rounds_seconds: block.restBetweenRoundsSeconds,
        time_limit_seconds: block.timeLimitSeconds,
        items: block.items.map(mapSchemeItemToApi),
    };
}

// --- Каталог -------------------------------------------------------------

export type ApiComplex = {
    id: string;
    name: string;
    types: ComplexType[];
    description: string;
    scheme_display: string;
    scheme_steps?: number[] | null;
    total_reps?: number | null;
    movements: MovementType[];
    exercise: string;
    exercise_ids?: string[] | null;
    scheme?: ApiSchemeBlock[] | null;
    scheme_note?: string | null;
    result_metrics: MetricType[];
    instructions?: string | null;
    restrictions?: string | null;
};

export function mapApiComplexToComplex(apiComplex: ApiComplex): Complex {
    return {
        id: apiComplex.id,
        name: apiComplex.name,
        types: apiComplex.types,
        description: apiComplex.description,
        schemeDisplay: apiComplex.scheme_display,
        schemeSteps: apiComplex.scheme_steps ?? undefined,
        totalReps: apiComplex.total_reps ?? undefined,
        movements: apiComplex.movements,
        exercise: apiComplex.exercise,
        exerciseIds: apiComplex.exercise_ids ?? [],
        scheme: (apiComplex.scheme ?? []).map(mapApiSchemeBlock),
        schemeNote: apiComplex.scheme_note ?? undefined,
        resultMetrics: apiComplex.result_metrics,
        instructions: apiComplex.instructions ?? undefined,
        restrictions: apiComplex.restrictions ?? undefined,
    };
}

/**
 * Тело запроса на создание/редактирование комплекса. Форма
 * (ComplexForm) всегда держит полное состояние, поэтому в отличие от
 * mapCompletionUpdateToApi ниже частичная отправка не нужна — при
 * редактировании api/complexes.ts просто убирает поле id перед
 * отправкой (сервер и не ждёт его в теле PUT, см.
 * app.models_complex.ComplexUpdate).
 */
export function mapNewComplexToApi(
    complex: NewComplex
): Record<string, unknown> {
    return {
        id: complex.id,
        name: complex.name,
        types: complex.types,
        description: complex.description,
        // Тип движения (movements) не шлём: сервер выводит его из
        // упражнений схемы. Схему шлём структурой. Список разных упражнений и текст
        // "Упражнение(я)" не шлём: сервер выводит их из схемы сам.
        // Устаревший текстовый вариант схемы (scheme_display и др.) не
        // трогаем — он остаётся только у старых комплексов.
        scheme: complex.scheme.map(mapSchemeBlockToApi),
        scheme_note: complex.schemeNote.trim() || null,
        result_metrics: complex.resultMetrics,
        instructions: complex.instructions.trim() || null,
        restrictions: complex.restrictions.trim() || null,
    };
}

// --- Выполнение ------------------------------------------------------------

export type ApiComplexCompletion = {
    id: number;
    complex_id: string;
    user_id: number;
    result_time_seconds?: number | null;
    result_reps?: number | null;
    result_sets?: number | null;
    result_rounds?: number | null;
    result_duration_seconds?: number | null;
    result_count?: number | null;
    diary_entry_id?: number | null;
    completed_date: string;
    created_at: string;
    updated_at: string;
};

export function mapApiCompletionToCompletion(
    apiCompletion: ApiComplexCompletion
): ComplexCompletion {
    return {
        id: String(apiCompletion.id),
        complexId: apiCompletion.complex_id,
        userId: String(apiCompletion.user_id),
        resultTimeSeconds: apiCompletion.result_time_seconds ?? undefined,
        resultReps: apiCompletion.result_reps ?? undefined,
        resultSets: apiCompletion.result_sets ?? undefined,
        resultRounds: apiCompletion.result_rounds ?? undefined,
        resultDurationSeconds:
            apiCompletion.result_duration_seconds ?? undefined,
        resultCount: apiCompletion.result_count ?? undefined,
        diaryEntryId:
            apiCompletion.diary_entry_id !== null &&
            apiCompletion.diary_entry_id !== undefined
                ? String(apiCompletion.diary_entry_id)
                : undefined,
        completedDate: apiCompletion.completed_date,
        createdAt: apiCompletion.created_at,
        updatedAt: apiCompletion.updated_at,
    };
}

export function mapNewCompletionToApi(
    completion: NewComplexCompletion
): Record<string, unknown> {
    return {
        complex_id: completion.complexId,
        result_time_seconds: completion.resultTimeSeconds ?? null,
        result_reps: completion.resultReps ?? null,
        result_sets: completion.resultSets ?? null,
        result_rounds: completion.resultRounds ?? null,
        result_duration_seconds: completion.resultDurationSeconds ?? null,
        result_count: completion.resultCount ?? null,
        diary_entry_id: completion.diaryEntryId ?? null,
        completed_date: completion.completedDate,
    };
}

/**
 * В отличие от создания, при редактировании нельзя слепо слать все
 * поля с null — бэкенд использует exclude_unset и null действительно
 * обнулит значение. Поэтому в тело попадают только реально
 * переданные поля, а отвязка записи дневника — отдельный явный флаг
 * (см. ComplexCompletionUpdate.clear_diary_entry в
 * app/models_complex.py).
 */
export function mapCompletionUpdateToApi(
    completion: Partial<NewComplexCompletion>,
    clearDiaryEntry: boolean = false
): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (completion.resultTimeSeconds !== undefined) {
        payload.result_time_seconds = completion.resultTimeSeconds;
    }
    if (completion.resultReps !== undefined) {
        payload.result_reps = completion.resultReps;
    }
    if (completion.resultSets !== undefined) {
        payload.result_sets = completion.resultSets;
    }
    if (completion.resultRounds !== undefined) {
        payload.result_rounds = completion.resultRounds;
    }
    if (completion.resultDurationSeconds !== undefined) {
        payload.result_duration_seconds = completion.resultDurationSeconds;
    }
    if (completion.resultCount !== undefined) {
        payload.result_count = completion.resultCount;
    }
    if (completion.completedDate !== undefined) {
        payload.completed_date = completion.completedDate;
    }

    if (clearDiaryEntry) {
        payload.clear_diary_entry = true;
    } else if (completion.diaryEntryId !== undefined) {
        payload.diary_entry_id = completion.diaryEntryId;
    }

    return payload;
}

// --- Комментарии -------------------------------------------------------

export type ApiComplexLeaderboard = {
    total: number;
    rows: {
        rank: number;
        user_id: number;
        nickname: string;
        value: number;
        is_me: boolean;
    }[];
};

export function mapApiLeaderboardToLeaderboard(
    apiBoard: ApiComplexLeaderboard
): ComplexLeaderboard {
    return {
        total: apiBoard.total,
        rows: apiBoard.rows.map((row) => ({
            rank: row.rank,
            userId: String(row.user_id),
            nickname: row.nickname,
            value: row.value,
            isMe: row.is_me,
        })),
    };
}

export type ApiComplexComment = {
    id: number;
    complex_id: string;
    user_id: number;
    text: string;
    created_at: string;
};

export function mapApiCommentToComment(
    apiComment: ApiComplexComment
): ComplexComment {
    return {
        id: String(apiComment.id),
        complexId: apiComment.complex_id,
        userId: String(apiComment.user_id),
        text: apiComment.text,
        createdAt: apiComment.created_at,
    };
}
