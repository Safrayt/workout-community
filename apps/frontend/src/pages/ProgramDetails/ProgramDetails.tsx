import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Badge from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import Avatar from "../../components/ui/Avatar/Avatar";
import ProgramQuickFacts from "../../components/ProgramQuickFacts/ProgramQuickFacts";
import ProgramStructureView from "../../components/ProgramStructureView/ProgramStructureView";
import ProgramVersionHistory from "../../components/ProgramVersionHistory/ProgramVersionHistory";
import ProgramComments from "../../components/ProgramComments/ProgramComments";

import "../../styles/components/program-details.css";

import {
    getProgram,
    getProgramVersion,
    listProgramVersions,
} from "../../api/programs";
import type { Program, ProgramVersion, ProgramVersionSummary } from "../../types/program";

import { usePrograms } from "../../context/ProgramContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

import { programDifficultyLabels } from "../../constants/programTypes";

export default function ProgramDetails() {
    const { id } = useParams();
    const { currentUser } = useCurrentUser();
    const { toggleFavorite } = usePrograms();

    const [program, setProgram] = useState<Program | undefined>(undefined);
    const [currentVersion, setCurrentVersion] = useState<
        ProgramVersion | undefined
    >(undefined);
    const [versions, setVersions] = useState<ProgramVersionSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        setIsLoading(true);
        setNotFound(false);

        getProgram(id)
            .then(async (loadedProgram) => {
                if (cancelled) return;

                setProgram(loadedProgram);

                const tasks: Promise<void>[] = [];

                if (loadedProgram.isPublished && loadedProgram.currentVersionId) {
                    tasks.push(
                        getProgramVersion(
                            id,
                            loadedProgram.currentVersionId
                        ).then((version) => {
                            if (!cancelled) setCurrentVersion(version);
                        })
                    );

                    tasks.push(
                        listProgramVersions(id).then((list) => {
                            if (!cancelled) setVersions(list);
                        })
                    );
                }

                await Promise.all(tasks);
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить программу:", error);
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    async function handleToggleFavorite() {
        if (!program) return;

        try {
            await toggleFavorite(program);

            setProgram({
                ...program,
                isFavoritedByViewer: !program.isFavoritedByViewer,
                favoritesCount: program.isFavoritedByViewer
                    ? program.favoritesCount - 1
                    : program.favoritesCount + 1,
            });
        } catch (error: unknown) {
            console.error("Не удалось изменить избранное:", error);
        }
    }

    if (isLoading) {
        return <p className="program-details__loading">Загрузка…</p>;
    }

    if (notFound || !program) {
        return (
            <div className="program-details__not-found">
                <p>Программа не найдена.</p>
                <Link to="/programs">← Ко всем программам</Link>
            </div>
        );
    }

    const isAuthor = program.authorId === currentUser.id;

    return (
        <div className="program-details">
            <Link to="/programs" className="program-details__back">
                ← Программы
            </Link>

            {
                program.coverUrl && (
                    <img
                        src={program.coverUrl}
                        alt=""
                        className="program-details__cover"
                    />
                )
            }

            <div className="program-details__header">
                <h1 className="program-details__title">{program.title}</h1>

                {
                    program.difficulty && (
                        <Badge variant="primary">
                            {programDifficultyLabels[program.difficulty]}
                        </Badge>
                    )
                }

                {
                    isAuthor && (
                        <Link
                            to={`/programs/${program.id}/edit`}
                            className="program-details__edit-link"
                        >
                            Редактировать
                        </Link>
                    )
                }
            </div>

            <div className="program-details__author">
                <Avatar
                    name={program.authorNickname}
                    avatarUrl={program.authorAvatarUrl}
                    size="sm"
                />
                <span>{program.authorNickname}</span>
            </div>

            {
                !program.isPublished && (
                    <p className="program-details__draft-notice">
                        {
                            isAuthor
                                ? "Это черновик — его видите только вы. Опубликуйте версию, чтобы программа появилась в каталоге."
                                : "Эта программа ещё не опубликована."
                        }
                    </p>
                )
            }

            {
                program.description && (
                    <p className="program-details__description">
                        {program.description}
                    </p>
                )
            }

            <ProgramQuickFacts program={program} currentVersion={currentVersion} />

            <div className="program-details__actions">
                <Button
                    type="button"
                    variant={program.isFavoritedByViewer ? "primary" : "outline"}
                    onClick={handleToggleFavorite}
                >
                    {
                        program.isFavoritedByViewer
                            ? "В избранном"
                            : "Добавить в избранное"
                    }
                </Button>
            </div>

            {
                currentVersion && (
                    <section className="program-details__section">
                        <h2 className="program-details__section-title">
                            Структура программы
                        </h2>

                        <ProgramStructureView
                            structure={currentVersion.structure}
                            programTitle={program.title}
                            versionNumber={currentVersion.versionNumber}
                        />
                    </section>
                )
            }

            {
                versions.length > 0 && (
                    <ProgramVersionHistory
                        programId={program.id}
                        versions={versions}
                        currentVersionId={program.currentVersionId}
                    />
                )
            }

            <ProgramComments programId={program.id} />
        </div>
    );
}
