import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";

import { ProgramVersionList } from "../../components/ProgramVersionHistory/ProgramVersionHistory";

import "../../styles/components/program-versions.css";

import { getProgram, listProgramVersions } from "../../api/programs";
import type { Program, ProgramVersionSummary } from "../../types/program";

type LoadResult = {
    key: string;
    program?: Program;
    versions?: ProgramVersionSummary[];
};

/**
 * /programs/:id/versions — вся история опубликованных версий программы.
 * На странице самой программы показана только последняя версия, чтобы
 * она не росла с каждой новой версией (см. ProgramVersionHistory).
 * Каждая версия ведёт на страницу версии (pages/ProgramVersionDetails).
 */
export default function ProgramVersions() {
    const { id } = useParams();

    // Результат помнит, для какой программы он загружен: пока не совпал с
    // текущим адресом — показываем «Загрузка…», а не прошлую страницу.
    const requestKey = `${id}`;

    const [result, setResult] = useState<LoadResult | undefined>(undefined);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        Promise.all([getProgram(id), listProgramVersions(id)])
            .then(([program, versions]) => {
                if (!cancelled) {
                    setResult({ key: requestKey, program, versions });
                }
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить историю версий:", error);
                if (!cancelled) setResult({ key: requestKey });
            });

        return () => {
            cancelled = true;
        };
    }, [id, requestKey]);

    const isLoading = result?.key !== requestKey;
    const program = isLoading ? undefined : result?.program;
    const versions = isLoading ? undefined : result?.versions;

    usePageMeta(program ? `История версий — ${program.title}` : undefined);

    if (isLoading) {
        return <p className="program-versions__loading">Загрузка…</p>;
    }

    if (!program || !versions) {
        return (
            <div className="program-versions__not-found">
                <p>Программа не найдена.</p>
                <Link to="/programs">← Ко всем программам</Link>
            </div>
        );
    }

    // Сервер отдаёт версии от старых к новым; показываем свежие сверху.
    const newestFirst = [...versions].reverse();

    return (
        <div className="program-versions">
            <Link to={`/programs/${program.id}`} className="program-versions__back">
                ← {program.title}
            </Link>

            <h1 className="program-versions__title">История версий</h1>

            <p className="program-versions__meta">
                Опубликованных версий: {versions.length}
            </p>

            {
                newestFirst.length === 0 ? (
                    <p className="program-versions__empty">
                        Опубликованных версий пока нет.
                    </p>
                ) : (
                    <ProgramVersionList
                        programId={program.id}
                        versions={newestFirst}
                        currentVersionId={program.currentVersionId}
                    />
                )
            }
        </div>
    );
}
