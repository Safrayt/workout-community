import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ProgramForm from "../../components/ProgramForm/ProgramForm";
import ProgramStructureEditor from "../../components/ProgramStructureEditor/ProgramStructureEditor";
import ProgramVersionHistory from "../../components/ProgramVersionHistory/ProgramVersionHistory";
import FormSection from "../../components/ui/FormSection/FormSection";
import Textarea from "../../components/ui/Textarea/Textarea";
import Switch from "../../components/ui/Switch/Switch";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import "../../styles/components/program-edit.css";

import {
    getProgram,
    getProgramDraft,
    listProgramVersions,
    publishProgramDraft,
    updateProgramDraft,
} from "../../api/programs";
import type {
    Program,
    ProgramStructure,
    ProgramVersion,
    ProgramVersionSummary,
} from "../../types/program";
import type { NewProgram } from "../../types/newProgram";

import { usePrograms } from "../../context/ProgramContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

/**
 * Рабочая страница автора программы — три независимых действия
 * (см. UX-документ, п.3 и п.20): изменить информацию о программе,
 * сохранить черновик структуры и опубликовать его как новую версию.
 * Публикация — единственное действие, которое реально необратимо
 * влияет на других пользователей, поэтому у неё отдельное
 * подтверждение и обязательный комментарий (кроме самой первой
 * публикации).
 */
export default function ProgramEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useCurrentUser();

    const {
        getProgramById,
        updateProgram,
        deleteProgram,
        upsertProgram,
    } = usePrograms();

    const [program, setProgram] = useState<Program | undefined>(
        id ? getProgramById(id) : undefined
    );
    const [draft, setDraft] = useState<ProgramVersion | undefined>(undefined);
    const [structure, setStructure] = useState<ProgramStructure>({
        sections: [],
    });
    const [versions, setVersions] = useState<ProgramVersionSummary[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [changelog, setChangelog] = useState("");
    const [isMajorBump, setIsMajorBump] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | undefined>(
        undefined
    );

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        // Программа может быть уже в каталоге (контексте), но это
        // только опубликованные программы — свежесозданный черновик
        // там ещё не появится (см. context/ProgramContext.tsx
        // createProgram), поэтому саму программу тоже всегда
        // загружаем заново, а не полагаемся на кеш каталога.
        Promise.all([
            getProgram(id),
            getProgramDraft(id),
            listProgramVersions(id),
        ])
            .then(([loadedProgram, loadedDraft, loadedVersions]) => {
                if (cancelled) return;

                setProgram(loadedProgram);
                setDraft(loadedDraft);
                setStructure(loadedDraft.structure);
                setVersions(loadedVersions);
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить программу для редактирования:", error);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (!id || !program) {
        // Программы ещё нет в кеше каталога — это нормально сразу
        // после создания (создание не добавляет в публичный каталог,
        // см. context/ProgramContext.tsx createProgram). Раз мы уже
        // на странице /programs/:id/edit, доверяем ссылке и просто
        // ждём первой загрузки данных, а не показываем "не найдено".
        if (isLoading) {
            return <p className="program-edit__loading">Загрузка…</p>;
        }

        return (
            <div className="program-edit__not-found">
                <p>Программа не найдена.</p>
                <Link to="/programs">← Ко всем программам</Link>
            </div>
        );
    }

    if (program.authorId !== currentUser.id) {
        return (
            <div className="program-edit__not-found">
                <p>Редактировать эту программу можете только вы, если вы её автор.</p>
                <Link to={`/programs/${id}`}>← К программе</Link>
            </div>
        );
    }

    async function handleUpdateInfo(data: NewProgram) {
        try {
            const updated = await updateProgram(id!, data, program);
            setProgram(updated);
            setStatusMessage("Информация о программе сохранена.");
        } catch (error: unknown) {
            console.error("Не удалось сохранить информацию о программе:", error);
            window.alert("Не удалось сохранить изменения. Попробуйте ещё раз.");
        }
    }

    async function handleSaveDraft() {
        setIsSavingDraft(true);

        try {
            const updated = await updateProgramDraft(id!, structure);
            setDraft(updated);
            setStatusMessage("Черновик сохранён.");
        } catch (error: unknown) {
            console.error("Не удалось сохранить черновик:", error);
            window.alert("Не удалось сохранить черновик. Попробуйте ещё раз.");
        } finally {
            setIsSavingDraft(false);
        }
    }

    async function handlePublish() {
        if (program!.isPublished && changelog.trim().length === 0) {
            window.alert(
                "Опишите, что изменилось в новой версии — это обязательно " +
                    "для всех публикаций, кроме самой первой."
            );
            return;
        }

        const confirmed = window.confirm(
            program!.isPublished
                ? "Опубликовать новую версию? Предыдущая версия останется " +
                      "доступной в истории и не изменится."
                : "Опубликовать первую версию программы? После этого " +
                      "программа появится в общем каталоге."
        );

        if (!confirmed) return;

        setIsPublishing(true);

        try {
            // Сохраняем черновик перед публикацией — публикуется именно
            // то, что видно в редакторе сейчас, а не последнее
            // сохранённое состояние.
            await updateProgramDraft(id!, structure);

            const publishedVersion = await publishProgramDraft(id!, {
                changelog,
                major: isMajorBump,
            });

            const [newDraft, updatedVersions] = await Promise.all([
                getProgramDraft(id!),
                listProgramVersions(id!),
            ]);

            setDraft(newDraft);
            setStructure(newDraft.structure);
            setVersions(updatedVersions);
            setChangelog("");
            setIsMajorBump(false);

            const updatedProgram: Program = {
                ...program!,
                isPublished: true,
                currentVersionId: publishedVersion.id,
            };
            setProgram(updatedProgram);
            upsertProgram(updatedProgram);

            setStatusMessage(
                `Версия ${publishedVersion.versionNumber} опубликована.`
            );
        } catch (error: unknown) {
            console.error("Не удалось опубликовать версию:", error);
            window.alert("Не удалось опубликовать версию. Попробуйте ещё раз.");
        } finally {
            setIsPublishing(false);
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            "Удалить эту программу? Это действие нельзя отменить."
        );

        if (!confirmed) return;

        try {
            await deleteProgram(id!);
            navigate("/programs");
        } catch (error: unknown) {
            console.error("Не удалось удалить программу:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "Не удалось удалить программу.";

            window.alert(message);
        }
    }

    return (
        <div className="program-edit">
            <Link to={`/programs/${id}`} className="program-edit__back">
                ← К программе
            </Link>

            <h1 className="program-edit__title">Редактирование программы</h1>

            {
                statusMessage && (
                    <p className="program-edit__status">{statusMessage}</p>
                )
            }

            <FormSection title="Информация о программе">
                <ProgramForm
                    initialValue={{
                        title: program.title,
                        description: program.description,
                        coverUrl: program.coverUrl,
                        difficulty: program.difficulty,
                    }}
                    submitLabel="Сохранить информацию"
                    onSubmit={handleUpdateInfo}
                    onCancel={() => navigate(`/programs/${id}`)}
                />
            </FormSection>

            <FormSection
                title={
                    program.isPublished
                        ? "Структура (черновик следующей версии)"
                        : "Структура программы"
                }
            >
                {
                    isLoading || !draft ? (
                        <p className="program-edit__loading">
                            Загрузка структуры…
                        </p>
                    ) : (
                        <>
                            <ProgramStructureEditor
                                value={structure}
                                onChange={setStructure}
                            />

                            <ActionGroup>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSaveDraft}
                                    disabled={isSavingDraft}
                                >
                                    {
                                        isSavingDraft
                                            ? "Сохранение…"
                                            : "Сохранить черновик"
                                    }
                                </Button>
                            </ActionGroup>
                        </>
                    )
                }
            </FormSection>

            <FormSection title="Публикация версии">
                <p className="program-edit__hint">
                    {
                        program.isPublished
                            ? "После публикации предыдущая версия останется доступной в истории и не изменится."
                            : "Первая публикация не требует комментария об изменениях."
                    }
                </p>

                {
                    program.isPublished && (
                        <Textarea
                            id="program-edit-changelog"
                            label="Что изменилось"
                            value={changelog}
                            onChange={(event) => setChangelog(event.target.value)}
                            rows={3}
                            placeholder="Например: исправлено описание подтягиваний, добавлен третий блок"
                        />
                    )
                }

                <Switch
                    id="program-edit-major-bump"
                    label="Существенное изменение (например, 1.2 → 2.0 вместо 1.2 → 1.3)"
                    checked={isMajorBump}
                    onChange={setIsMajorBump}
                />

                <ActionGroup>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handlePublish}
                        disabled={isPublishing || isLoading}
                    >
                        {
                            isPublishing
                                ? "Публикация…"
                                : program.isPublished
                                    ? "Опубликовать новую версию"
                                    : "Опубликовать первую версию"
                        }
                    </Button>
                </ActionGroup>
            </FormSection>

            {
                versions.length > 0 && (
                    <ProgramVersionHistory
                        programId={id}
                        versions={versions}
                        currentVersionId={program.currentVersionId}
                    />
                )
            }

            {
                !program.isPublished && (
                    <FormSection title="Опасная зона">
                        <p className="program-edit__hint">
                            Программу можно удалить, только пока она ещё ни
                            разу не публиковалась.
                        </p>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDelete}
                        >
                            Удалить программу
                        </Button>
                    </FormSection>
                )
            }
        </div>
    );
}
