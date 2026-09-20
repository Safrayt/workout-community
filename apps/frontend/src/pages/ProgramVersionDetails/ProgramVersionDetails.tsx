import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ProgramStructureView from "../../components/ProgramStructureView/ProgramStructureView";

import "../../styles/components/program-version-details.css";

import { getProgram, getProgramVersion } from "../../api/programs";
import type { Program, ProgramVersion } from "../../types/program";

import { formatDate } from "../../utils/formatDate";

/**
 * Просмотр конкретной исторической версии (п.4.1, п.6 документа —
 * "пользователь, который тренировался по старой версии, должен иметь
 * возможность понять, какую именно программу он использовал"). Ссылка
 * сюда ведёт и из истории версий на странице программы, и из записи
 * дневника, где зафиксирована конкретная версия.
 */
export default function ProgramVersionDetails() {
    const { id, versionId } = useParams();

    const [program, setProgram] = useState<Program | undefined>(undefined);
    const [version, setVersion] = useState<ProgramVersion | undefined>(
        undefined
    );
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id || !versionId) return;

        let cancelled = false;

        Promise.all([getProgram(id), getProgramVersion(id, versionId)])
            .then(([loadedProgram, loadedVersion]) => {
                if (cancelled) return;
                setProgram(loadedProgram);
                setVersion(loadedVersion);
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить версию программы:", error);
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, versionId]);

    if (isLoading) {
        return <p className="program-version-details__loading">Загрузка…</p>;
    }

    if (notFound || !program || !version) {
        return (
            <div className="program-version-details__not-found">
                <p>Версия программы не найдена.</p>
                <Link to="/programs">← Ко всем программам</Link>
            </div>
        );
    }

    const isCurrent = program.currentVersionId === version.id;

    return (
        <div className="program-version-details">
            <Link
                to={`/programs/${program.id}`}
                className="program-version-details__back"
            >
                ← {program.title}
            </Link>

            <h1 className="program-version-details__title">
                {program.title} — версия {version.versionNumber}
            </h1>

            {
                isCurrent && (
                    <p className="program-version-details__current-notice">
                        Это текущая версия программы.
                    </p>
                )
            }

            {
                !isCurrent && (
                    <p className="program-version-details__historical-notice">
                        Это историческая версия. Актуальное содержимое
                        программы может отличаться — <Link to={`/programs/${program.id}`}>
                            посмотреть текущую версию
                        </Link>.
                    </p>
                )
            }

            {
                version.publishedAt && (
                    <p className="program-version-details__date">
                        Опубликована {formatDate(version.publishedAt)}
                    </p>
                )
            }

            {
                version.changelog && (
                    <div className="program-version-details__changelog">
                        <h2 className="program-version-details__changelog-title">
                            Что изменилось
                        </h2>
                        <p>{version.changelog}</p>
                    </div>
                )
            }

            <ProgramStructureView
                structure={version.structure}
                programTitle={program.title}
                versionNumber={version.versionNumber}
            />
        </div>
    );
}
