import type {
    Complex,
    ComplexType,
    DifficultyTier,
    MetricType,
    MovementType,
    StarCondition,
} from "../../types/complex";
import type { ComplexCompletion } from "../../types/complexCompletion";
import type { NewComplexCompletion } from "../../types/newComplexCompletion";

// --- Каталог -------------------------------------------------------------

export type ApiComplex = {
    id: string;
    name: string;
    type: ComplexType;
    description: string;
    scheme_display: string;
    scheme_steps?: number[] | null;
    total_reps?: number | null;
    movements: MovementType[];
    exercise: string;
    difficulty: DifficultyTier;
    result_metrics: MetricType[];
    star_conditions: StarCondition[];
    instructions?: string | null;
    restrictions?: string | null;
};

export function mapApiComplexToComplex(apiComplex: ApiComplex): Complex {
    return {
        id: apiComplex.id,
        name: apiComplex.name,
        type: apiComplex.type,
        description: apiComplex.description,
        schemeDisplay: apiComplex.scheme_display,
        schemeSteps: apiComplex.scheme_steps ?? undefined,
        totalReps: apiComplex.total_reps ?? undefined,
        movements: apiComplex.movements,
        exercise: apiComplex.exercise,
        difficulty: apiComplex.difficulty,
        resultMetrics: apiComplex.result_metrics,
        starConditions: apiComplex.star_conditions,
        instructions: apiComplex.instructions ?? undefined,
        restrictions: apiComplex.restrictions ?? undefined,
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
    stars: number;
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
        stars: apiCompletion.stars,
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
