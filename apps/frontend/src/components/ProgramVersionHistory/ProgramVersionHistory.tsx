import { Link } from "react-router-dom";

import InfoSection from "../ui/InfoSection/InfoSection";

import "../../styles/components/program-version-history.css";

import type { ProgramVersionSummary } from "../../types/program";

import { formatDate } from "../../utils/formatDate";

type ProgramVersionListProps = {
    programId: string;

    /** Версии в том порядке, в котором их показывать (свежие сверху). */
    versions: ProgramVersionSummary[];

    /** Версия, которая сейчас актуальна — подсвечивается в списке. */
    currentVersionId?: string;
};

/**
 * Список опубликованных версий — общий для раздела на странице
 * программы (там только последняя версия) и для страницы всей истории
 * (pages/ProgramVersions).
 */
export function ProgramVersionList({
    programId,
    versions,
    currentVersionId,
}: ProgramVersionListProps) {
    return (
        <ul className="program-version-history__list">
            {
                versions.map((version) => (
                    <li
                        key={version.id}
                        className="program-version-history__item"
                    >
                        <div className="program-version-history__header">
                            <Link
                                to={`/programs/${programId}/versions/${version.id}`}
                                className="program-version-history__version"
                            >
                                Версия {version.versionNumber}
                            </Link>

                            {
                                version.id === currentVersionId && (
                                    <span className="program-version-history__current-badge">
                                        текущая
                                    </span>
                                )
                            }

                            {
                                version.publishedAt && (
                                    <span className="program-version-history__date">
                                        {formatDate(version.publishedAt)}
                                    </span>
                                )
                            }
                        </div>

                        {
                            version.changelog && (
                                <p className="program-version-history__changelog">
                                    {version.changelog}
                                </p>
                            )
                        }
                    </li>
                ))
            }
        </ul>
    );
}

type ProgramVersionHistoryProps = {
    programId: string;

    /** Опубликованные версии от старых к новым — как их отдаёт сервер. */
    versions: ProgramVersionSummary[];

    /** Версия, которая сейчас актуальна — подсвечивается в списке. */
    currentVersionId?: string;

    /**
     * Сколько свежих версий показать здесь. Остальные — по ссылке «Вся
     * история версий» на отдельной странице, чтобы страница программы
     * не росла с каждой новой версией. Без значения — показать все.
     */
    maxVisible?: number;
};

/**
 * История опубликованных версий (п.4.1 документа: "Исторические
 * версии доступны для просмотра"). Черновик сюда не попадает — он не
 * версия с точки зрения истории, а рабочее состояние (см.
 * routers/programs.py list_program_versions на бэкенде).
 */
export default function ProgramVersionHistory({
    programId,
    versions,
    currentVersionId,
    maxVisible,
}: ProgramVersionHistoryProps) {
    if (versions.length === 0) {
        return null;
    }

    // Свежие версии сверху — удобнее видеть, что изменилось недавно.
    const sortedVersions = [...versions].reverse();

    const visibleVersions =
        maxVisible === undefined
            ? sortedVersions
            : sortedVersions.slice(0, maxVisible);

    const hasHiddenVersions = visibleVersions.length < sortedVersions.length;

    return (
        <InfoSection
            title={hasHiddenVersions ? "Последняя версия" : "История версий"}
            className="program-version-history"
        >
            <ProgramVersionList
                programId={programId}
                versions={visibleVersions}
                currentVersionId={currentVersionId}
            />

            {
                hasHiddenVersions && (
                    <Link
                        to={`/programs/${programId}/versions`}
                        className="program-version-history__all-link"
                    >
                        Вся история версий ({sortedVersions.length})
                    </Link>
                )
            }
        </InfoSection>
    );
}
