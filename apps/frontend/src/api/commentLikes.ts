import { apiFetch } from "./client";

/**
 * Где оставлен комментарий: у каждого вида — свои комментарии на сервере
 * (см. CommentKind в backend/app/models_social.py).
 */
export type CommentKind = "diary" | "event" | "program" | "complex";

export type CommentLikeSummary = {
    /** Как и остальные идентификаторы на фронтенде — строкой. */
    commentId: string;

    /** Сколько лайков у комментария. */
    count: number;

    /** Поставил ли лайк текущий пользователь (гость — всегда false). */
    likedByMe: boolean;
};

type ApiCommentLikeSummary = {
    comment_id: number;
    count: number;
    liked_by_me: boolean;
};

function mapSummary(api: ApiCommentLikeSummary): CommentLikeSummary {
    return {
        commentId: String(api.comment_id),
        count: api.count,
        likedByMe: api.liked_by_me,
    };
}

/** Лайки всех комментариев этого вида (только у тех, у кого они есть). */
export async function fetchCommentLikes(
    kind: CommentKind
): Promise<CommentLikeSummary[]> {
    const response = await apiFetch<ApiCommentLikeSummary[]>(
        `/comment-likes/${kind}`
    );

    return response.map(mapSummary);
}

export async function likeComment(
    kind: CommentKind,
    commentId: string
): Promise<CommentLikeSummary> {
    return mapSummary(
        await apiFetch<ApiCommentLikeSummary>(
            `/comment-likes/${kind}/${commentId}`,
            { method: "PUT" }
        )
    );
}

export async function unlikeComment(
    kind: CommentKind,
    commentId: string
): Promise<CommentLikeSummary> {
    return mapSummary(
        await apiFetch<ApiCommentLikeSummary>(
            `/comment-likes/${kind}/${commentId}`,
            { method: "DELETE" }
        )
    );
}
