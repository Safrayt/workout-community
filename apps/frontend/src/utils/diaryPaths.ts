/**
 * Канонические адреса записей и заметок дневника: /u/<ник автора>/diary/<id>
 * и /u/<ник автора>/diary/notes/<id> — запись живёт в дневнике своего
 * автора, а не "в общем /diary" (тот адрес — дневник вошедшего
 * пользователя, см. Diary.tsx).
 *
 * Старые адреса /diary/<id> и /diary/notes/<id> по-прежнему работают —
 * их подхватывает LegacyDiaryRedirect и перекидывает на канонический
 * (на них завязаны уже разосланные ссылки и старые уведомления).
 * Если ник автора по какой-то причине неизвестен (справочник
 * пользователей ещё не загрузился), ссылка строится по старому
 * адресу — редирект довершит остальное.
 *
 * Ник кодируем через encodeURIComponent: он может содержать пробелы и
 * даже "/" или "?" (ограничена только длина), а useParams() на
 * странице возвращает уже раскодированное значение.
 */
export function getWorkoutEntryPath(
    authorNickname: string | undefined,
    entryId: string
): string {
    return authorNickname
        ? `/u/${encodeURIComponent(authorNickname)}/diary/${entryId}`
        : `/diary/${entryId}`;
}

export function getDiaryNotePath(
    authorNickname: string | undefined,
    noteId: string
): string {
    return authorNickname
        ? `/u/${encodeURIComponent(authorNickname)}/diary/notes/${noteId}`
        : `/diary/notes/${noteId}`;
}
