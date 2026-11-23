import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/components/workout-entry-program.css";

import MuscleMap from "../MuscleMap/MuscleMap";
import MuscleMapLegend from "../MuscleMapLegend/MuscleMapLegend";

import { getProgram, getProgramVersion } from "../../api/programs";
import { muscleGroupLabels } from "../../constants/muscleGroups";
import { useExercises } from "../../context/ExerciseContext";
import type {
    Program,
    ProgramScheme,
    ProgramVersion,
} from "../../types/program";
import { getComplexMuscles } from "../../utils/complexMuscles";
import { getSchemeExercises } from "../../utils/programExercises";

type WorkoutEntryProgramProps = {
    programId?: string;
    programVersionId?: string;
    programSection?: string;
    programScheme?: string;

    /** Id раздела и схемы в структуре зафиксированной версии: по ним
     *  находится схема и строится карта мышц. У старых записей их нет. */
    programSectionId?: string;
    programSchemeId?: string;
};

/**
 * Схема записи в структуре её версии. Раздел сужает поиск, если он указан;
 * схема без раздела (так не сохраняется, но на всякий случай) ищется по
 * всем разделам.
 */
function findScheme(
    version: ProgramVersion | undefined,
    sectionId: string | undefined,
    schemeId: string | undefined
): ProgramScheme | undefined {
    if (!version || !schemeId) {
        return undefined;
    }

    const sections = sectionId
        ? version.structure.sections.filter((section) => section.id === sectionId)
        : version.structure.sections;

    for (const section of sections) {
        const scheme = section.schemes.find((item) => item.id === schemeId);

        if (scheme) {
            return scheme;
        }
    }

    return undefined;
}

/**
 * Показывает связанную программу так, как описано в UX-документе,
 * п.6: "В старой записи дневника: Сила на турниках — версия 1.1" —
 * именно та версия, что была зафиксирована при создании записи, а не
 * текущая версия программы (см. WorkoutEntry.programVersionId в
 * models_diary.py).
 *
 * Оформление такое же, как у WorkoutEntryComplexes: заголовок
 * «Используемая программа» и белая плашка — название и версия, ниже
 * (если указаны) раздел и схема, справа ссылка «Открыть программу».
 *
 * Если выбрана схема, под плашкой — карта мышц, которые эта схема
 * нагружает: складывается из мышц упражнений схемы (те, что выбраны из
 * базы) именно в той версии, на которой записана тренировка.
 */
export default function WorkoutEntryProgram({
    programId,
    programVersionId,
    programSection,
    programScheme,
    programSectionId,
    programSchemeId,
}: WorkoutEntryProgramProps) {
    const { exercises } = useExercises();

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

    const muscles = useMemo(() => {
        const scheme = findScheme(version, programSectionId, programSchemeId);

        return scheme
            ? getComplexMuscles(getSchemeExercises(scheme, exercises))
            : undefined;
    }, [version, programSectionId, programSchemeId, exercises]);

    if (!programId || !program) {
        return null;
    }

    const hasMuscles =
        muscles !== undefined &&
        (muscles.target.length > 0 || muscles.auxiliary.length > 0);

    return (
        <div className="workout-entry-program">
            <h3 className="workout-entry-program__title">Используемая программа</h3>

            <div className="workout-entry-program__item">
                <div className="workout-entry-program__info">
                    <span className="workout-entry-program__name">
                        {program.title}

                        {
                            version?.versionNumber && (
                                <span className="workout-entry-program__version">
                                    {" "}— версия {version.versionNumber}
                                </span>
                            )
                        }
                    </span>

                    {
                        (programSection || programScheme) && (
                            <span className="workout-entry-program__details">
                                {programSection && <>Раздел: {programSection}</>}
                                {programSection && programScheme && " · "}
                                {programScheme && <>Схема: {programScheme}</>}
                            </span>
                        )
                    }
                </div>

                <Link
                    to={`/programs/${programId}`}
                    className="workout-entry-program__link"
                >
                    Открыть программу
                </Link>
            </div>

            {
                hasMuscles && (
                    <div className="workout-entry-program__muscles">
                        <h4 className="workout-entry-program__muscles-title">
                            Нагружаемые мышцы
                        </h4>

                        <div className="workout-entry-program__muscles-body">
                            <div className="workout-entry-program__map">
                                <MuscleMap
                                    targetMuscles={muscles.target}
                                    auxiliaryMuscles={muscles.auxiliary}
                                />
                            </div>

                            <div className="workout-entry-program__muscles-text">
                                <MuscleMapLegend
                                    items={
                                        muscles.auxiliary.length > 0
                                            ? ["target", "auxiliary"]
                                            : ["target"]
                                    }
                                />

                                <p>
                                    <strong>Целевые:</strong>{" "}
                                    {muscles.target
                                        .map((key) => muscleGroupLabels[key])
                                        .join(", ") || "—"}
                                </p>

                                {
                                    muscles.auxiliary.length > 0 && (
                                        <p>
                                            <strong>Вспомогательные:</strong>{" "}
                                            {muscles.auxiliary
                                                .map((key) => muscleGroupLabels[key])
                                                .join(", ")}
                                        </p>
                                    )
                                }

                                <p className="workout-entry-program__muscles-note">
                                    Складывается из мышц упражнений выбранной
                                    схемы (из базы упражнений). Показывает,
                                    что нагружает схема, а не фактически
                                    выполненный объём.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
