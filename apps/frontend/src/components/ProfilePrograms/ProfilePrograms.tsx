import { Link } from "react-router-dom";

import "../../styles/components/profile-training.css";

import { usePrograms } from "../../context/ProgramContext";
import type { WorkoutEntry } from "../../types/workoutEntry";
import { pluralizeRu } from "../../utils/pluralize";
import {
    buildProfilePrograms,
    formatProfileDate,
} from "../../utils/profileTraining";

const MAX_SCHEMES_SHOWN = 3;

type ProfileProgramsProps = {
    /** Тренировочные записи пользователя, видимые тому, кто смотрит профиль. */
    entries: WorkoutEntry[];

    isOwnProfile: boolean;
};

/**
 * Программы, по которым пользователь тренировался (отмечал их в
 * тренировочных записях дневника): сколько тренировок, за какой период,
 * по каким схемам. Берётся из тех же записей, что и «Последние записи»:
 * закрытые от читателя записи сюда не попадают.
 */
export default function ProfilePrograms({
    entries,
    isOwnProfile,
}: ProfileProgramsProps) {
    const { getProgramById } = usePrograms();

    const programs = buildProfilePrograms(entries);

    if (programs.length === 0) {
        return (
            <div className="profile-empty">
                <p>
                    {
                        isOwnProfile
                            ? "Пока нет тренировок по программам. Отметьте программу в тренировочной записи — и она появится здесь."
                            : "Пока нет тренировок по программам."
                    }
                </p>
            </div>
        );
    }

    return (
        <ul className="profile-training">
            {
                programs.map((program) => {
                    const info = getProgramById(program.programId);
                    const shownSchemes = program.schemes.slice(0, MAX_SCHEMES_SHOWN);
                    const hiddenSchemes = program.schemes.length - shownSchemes.length;

                    return (
                        <li key={program.programId} className="profile-training__item">
                            <div className="profile-training__head">
                                {
                                    info ? (
                                        <Link
                                            to={`/programs/${program.programId}`}
                                            className="profile-training__title"
                                        >
                                            {info.title}
                                        </Link>
                                    ) : (
                                        <span className="profile-training__title">
                                            Программа недоступна
                                        </span>
                                    )
                                }

                                <span
                                    className={
                                        program.isActive
                                            ? "profile-training__badge profile-training__badge--active"
                                            : "profile-training__badge"
                                    }
                                >
                                    {program.isActive ? "Идёт сейчас" : "Пройдена ранее"}
                                </span>
                            </div>

                            <p className="profile-training__meta">
                                {program.workouts}{" "}
                                {pluralizeRu(program.workouts, ["тренировка", "тренировки", "тренировок"])}
                                {" · "}
                                {
                                    program.firstDate === program.lastDate
                                        ? formatProfileDate(program.lastDate)
                                        : `с ${formatProfileDate(program.firstDate)} по ${formatProfileDate(program.lastDate)}`
                                }
                            </p>

                            {
                                shownSchemes.length > 0 && (
                                    <p className="profile-training__meta">
                                        Схемы: {shownSchemes.join(", ")}
                                        {hiddenSchemes > 0 && ` и ещё ${hiddenSchemes}`}
                                    </p>
                                )
                            }
                        </li>
                    );
                })
            }
        </ul>
    );
}
