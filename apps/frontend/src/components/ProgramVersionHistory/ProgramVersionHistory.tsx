import { Link } from "react-router-dom";

import InfoSection from "../ui/InfoSection/InfoSection";

import "../../styles/components/program-version-history.css";

import type { ProgramVersionSummary } from "../../types/program";

import { formatDate } from "../../utils/formatDate";

type ProgramVersionHistoryProps = {
    programId: string;

    versions: ProgramVersionSummary[];

    /** Версия, которая сейчас актуальна — подсвечивается в списке. */
    currentVersionId?: string;
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
}: ProgramVersionHistoryProps) {
    if (versions.length === 0) {
        return null;
    }

    // Свежие версии сверху — удобнее видеть, что изменилось недавно.
    const sortedVersions = [...versions].reverse();

    return (
        <InfoSection title="История версий" className="program-version-history">
            <ul className="program-version-history__list">
                {
                    sortedVersions.map((version) => (
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
        </InfoSection>
    );
}
