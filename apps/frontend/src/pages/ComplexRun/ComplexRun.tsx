import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { RunScreen } from "../ProgramSchemeRun/ProgramSchemeRun";

import { useComplexes } from "../../context/ComplexContext";
import { usePageMeta } from "../../hooks/usePageMeta";

import { getAutoSchemeProblems, isAutoScheme } from "../../utils/programAuto";
import { buildRunSteps } from "../../utils/programRun";

/**
 * Прохождение комплекса каталога с помощником и таймерами — тот же
 * помощник, что у схем программ (RunScreen), а схема — схема комплекса
 * в новом формате (Complex.autoScheme). Страница только для вошедших
 * пользователей. Ход прохождения хранится в браузере: можно закрыть
 * вкладку и вернуться.
 */
export default function ComplexRun() {
    const { id } = useParams();
    const { getComplexById, isLoading } = useComplexes();

    const complexDef = id ? getComplexById(id) : undefined;

    // Название комплекса — название схемы на экранах помощника.
    const scheme = useMemo(
        () =>
            complexDef?.autoScheme
                ? { ...complexDef.autoScheme, name: complexDef.name }
                : undefined,
        [complexDef]
    );

    const steps = useMemo(
        () => (scheme && isAutoScheme(scheme) ? buildRunSteps(scheme) : []),
        [scheme]
    );

    usePageMeta(complexDef ? `Прохождение: ${complexDef.name}` : undefined);

    if (isLoading) {
        return <p className="program-scheme-run__message">Загрузка…</p>;
    }

    if (!complexDef) {
        return (
            <div className="program-scheme-run__message">
                <p>Комплекс не найден.</p>
                <Link to="/complexes">← Ко всем комплексам</Link>
            </div>
        );
    }

    const backTo = `/complexes/${complexDef.id}`;

    if (
        !scheme ||
        !isAutoScheme(scheme) ||
        getAutoSchemeProblems(scheme).length > 0
    ) {
        return (
            <div className="program-scheme-run__message">
                <p>
                    Этот комплекс нельзя пройти с помощником: для него не
                    задана схема с таймерами.
                </p>
                <Link to={backTo}>← К комплексу</Link>
            </div>
        );
    }

    return (
        <div className="program-scheme-run">
            <RunScreen
                // Другой комплекс — новое прохождение с нуля.
                key={complexDef.id}
                ids={{
                    programId: `complex-${complexDef.id}`,
                    versionId: "0",
                    schemeId: "scheme",
                }}
                programTitle={complexDef.name}
                sectionName={undefined}
                scheme={scheme}
                steps={steps}
                backTo={backTo}
                complexDef={complexDef}
            />
        </div>
    );
}
