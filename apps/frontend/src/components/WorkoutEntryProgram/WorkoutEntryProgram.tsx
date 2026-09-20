import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/components/workout-entry-program.css";

import { getProgram, getProgramVersion } from "../../api/programs";
import type { Program, ProgramVersion } from "../../types/program";

type WorkoutEntryProgramProps = {
    programId?: string;
    programVersionId?: string;
    programSection?: string;
    programScheme?: string;
};

/**
 * Показывает связанную программу так, как описано в UX-документе,
 * п.6: "В старой записи дневника: Сила на турниках — версия 1.1" —
 * именно та версия, что была зафиксирована при создании записи, а не
 * текущая версия программы (см. WorkoutEntry.programVersionId в
 * models_diary.py).
 */
export default function WorkoutEntryProgram({
    programId,
    programVersionId,
    programSection,
    programScheme,
}: WorkoutEntryProgramProps) {
    const [program, setProgram] = useState<Program | undefined>(undefined);
    const [version, setVersion] = useState<ProgramVersion | undefined>(
        undefined
    );

    useEffect(() => {
        if (!programId || !programVersionId) return;

        let cancelled = false;

        Promise.all([
            getProgram(programId),
            getProgramVersion(programId, programVersionId),
        ])
            .then(([loadedProgram, loadedVersion]) => {
                if (!cancelled) {
                    setProgram(loadedProgram);
                    setVersion(loadedVersion);
                }
            })
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить связанную программу:",
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, [programId, programVersionId]);

    if (!programId || !program) {
        return null;
    }

    return (
        <div className="workout-entry-program">
            <h3 className="workout-entry-program__title">Программа</h3>

            <p className="workout-entry-program__name">
                <Link to={`/programs/${programId}`}>{program.title}</Link>

                {
                    version?.versionNumber && (
                        <span className="workout-entry-program__version">
                            {" "}— версия {version.versionNumber}
                        </span>
                    )
                }
            </p>

            {
                (programSection || programScheme) && (
                    <p className="workout-entry-program__details">
                        {programSection && <>Раздел: {programSection}</>}
                        {programSection && programScheme && " · "}
                        {programScheme && <>Схема: {programScheme}</>}
                    </p>
                )
            }
        </div>
    );
}
