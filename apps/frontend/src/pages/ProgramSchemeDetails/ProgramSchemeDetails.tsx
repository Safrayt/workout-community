import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";

import ProgramSchemeContent from "../../components/ProgramSchemeContent/ProgramSchemeContent";
import Button from "../../components/ui/Button/Button";

import "../../styles/components/program-scheme-details.css";

import { getProgram, getProgramVersion } from "../../api/programs";
import type {
    Program,
    ProgramScheme,
    ProgramSection,
    ProgramVersion,
} from "../../types/program";

import { useAuth } from "../../context/CurrentUserContext";
import { useExercises } from "../../context/ExerciseContext";
import {
    movementTypeColors,
    movementTypeLabels,
} from "../../constants/movementTypes";
import { downloadSchemeAsImage } from "../../utils/exportSchemeImage";
import { getAutoSchemeProblems, isAutoScheme } from "../../utils/programAuto";
import { getSchemeExercises } from "../../utils/programExercises";

/** Схема с id schemeId и раздел, в котором она лежит. */
function findScheme(
    version: ProgramVersion,
    schemeId: string | undefined
): { section: ProgramSection; scheme: ProgramScheme } | undefined {
    for (const section of version.structure.sections) {
        const scheme = section.schemes.find((item) => item.id === schemeId);

        if (scheme) {
            return { section, scheme };
        }
    }

    return undefined;
}

type LoadResult = {
    key: string;
    program?: Program;
    version?: ProgramVersion;
};

/**
 * Схема программы на отдельной странице (оформление — как у страницы
 * комплекса, см. pages/ComplexDetails):
 * - /programs/:id/schemes/:schemeId — схема из текущей (опубликованной)
 *   версии программы;
 * - /programs/:id/versions/:versionId/schemes/:schemeId — из
 *   конкретной версии (так же, как страница версии, см.
 *   pages/ProgramVersionDetails).
 * Идентификатор схемы не меняется между версиями, пока автор не
 * удалил схему, поэтому ссылка на текущую версию остаётся рабочей.
 */
export default function ProgramSchemeDetails() {
    const { id, versionId, schemeId } = useParams();
    const location = useLocation();
    const { exercises } = useExercises();

    // Страница открыта и гостям: прохождение с таймерами — только для
    // вошедших.
    const { user } = useAuth();

    // Результат загрузки помнит, для какого адреса он получен: пока он не
    // совпадает с текущим (перешли на схему другой программы или версии),
    // показываем «Загрузка…», а не данные предыдущей страницы.
    const requestKey = `${id}/${versionId ?? ""}`;

    const [result, setResult] = useState<LoadResult | undefined>(undefined);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        getProgram(id)
            .then(async (loadedProgram) => {
                const targetVersionId =
                    versionId ?? loadedProgram.currentVersionId;

                // Нет опубликованной версии — показывать нечего.
                if (!targetVersionId) {
                    throw new Error("У программы нет опубликованной версии");
                }

                const loadedVersion = await getProgramVersion(
                    id,
                    targetVersionId
                );

                if (cancelled) return;

                setResult({
                    key: requestKey,
                    program: loadedProgram,
                    version: loadedVersion,
                });
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить схему программы:", error);
                if (!cancelled) setResult({ key: requestKey });
            });

        return () => {
            cancelled = true;
        };
    }, [id, versionId, requestKey]);

    const isLoading = result?.key !== requestKey;
    const program = isLoading ? undefined : result?.program;
    const version = isLoading ? undefined : result?.version;

    const found = version ? findScheme(version, schemeId) : undefined;

    usePageMeta(
        found && program
            ? `${found.scheme.name || "Схема"} — ${program.title}`
            : undefined
    );

    if (isLoading) {
        return <p className="program-scheme-details__loading">Загрузка…</p>;
    }

    if (!program || !version || !found) {
        return (
            <div className="program-scheme-details__not-found">
                <p>
                    {
                        program && version
                            ? "Такой схемы нет в этой версии программы."
                            : "Схема не найдена."
                    }
                </p>
                <Link to={program ? `/programs/${program.id}` : "/programs"}>
                    ← {program ? program.title : "Ко всем программам"}
                </Link>
            </div>
        );
    }

    const { section, scheme } = found;

    const isVersioned = versionId !== undefined;
    const isHistorical =
        isVersioned && program.currentVersionId !== version.id;

    const backTo = isVersioned
        ? `/programs/${program.id}/versions/${version.id}`
        : `/programs/${program.id}`;

    // Автоматическая схема, заполненная целиком, — можно проходить с
    // таймерами (неполные автоматические схемы не публикуются, но
    // историческая версия или старый черновик могли такой остаться).
    const canRun =
        isAutoScheme(scheme) && getAutoSchemeProblems(scheme).length === 0;
    const runPath = `${
        isVersioned
            ? `/programs/${program.id}/versions/${version.id}/schemes/${scheme.id}`
            : `/programs/${program.id}/schemes/${scheme.id}`
    }/run`;

    function handleDownload() {
        const nameById = new Map(
            exercises.map((exercise) => [exercise.id, exercise.name])
        );
        const movementById = new Map(
            exercises.map((exercise) => [exercise.id, exercise.movementType])
        );

        downloadSchemeAsImage(
            scheme,
            program!.title,
            version!.versionNumber,
            // Подпись для удалённого из базы упражнения — как на странице.
            (exerciseId) => nameById.get(exerciseId) ?? "Упражнение недоступно",
            // Тип движения показывается после названия, как на странице.
            (exerciseId) => {
                const movementType = movementById.get(exerciseId);

                return movementType ? movementTypeLabels[movementType] : undefined;
            }
        ).catch((error: unknown) => {
            console.error("Не удалось скачать схему как изображение:", error);
            window.alert("Не удалось скачать схему. Попробуйте ещё раз.");
        });
    }

    // Типы движения упражнений схемы из базы — теги под названием, как
    // у комплекса.
    const movements = [
        ...new Set(
            getSchemeExercises(scheme, exercises).map(
                (exercise) => exercise.movementType
            )
        ),
    ];

    return (
        <div className="program-scheme-details">
            <Link to={backTo} className="program-scheme-details__back">
                ← {program.title}
                {isVersioned && version.versionNumber && ` — версия ${version.versionNumber}`}
            </Link>

            <div className="program-scheme-details__header">
                <div className="program-scheme-details__title-row">
                    <h1 className="program-scheme-details__name">
                        {scheme.name || "Схема"}
                    </h1>

                    <button
                        type="button"
                        className="program-scheme-details__download"
                        onClick={handleDownload}
                    >
                        Скачать картинкой
                    </button>
                </div>

                <div className="program-scheme-details__tags">
                    {
                        section.name && (
                            <span className="program-scheme-details__chip">
                                Раздел: {section.name}
                            </span>
                        )
                    }

                    {
                        version.versionNumber && (
                            <span className="program-scheme-details__chip">
                                Версия {version.versionNumber}
                            </span>
                        )
                    }

                    {
                        movements.map((movement) => (
                            <span
                                key={movement}
                                className="program-scheme-details__chip"
                                style={
                                    {
                                        "--chip-color": movementTypeColors[movement],
                                    } as React.CSSProperties
                                }
                            >
                                <span
                                    className="program-scheme-details__dot"
                                    aria-hidden="true"
                                />

                                {movementTypeLabels[movement]}
                            </span>
                        ))
                    }
                </div>
            </div>

            {
                isHistorical && (
                    <p className="program-scheme-details__historical-notice">
                        Это схема из исторической версии программы. Актуальное
                        содержимое может отличаться —{" "}
                        <Link to={`/programs/${program.id}`}>
                            посмотреть текущую версию
                        </Link>.
                    </p>
                )
            }

            {
                canRun && (
                    user ? (
                        <div className="program-scheme-details__run">
                            <Link to={runPath}>
                                <Button>Начать выполнение схемы</Button>
                            </Link>

                            <p className="program-scheme-details__run-hint">
                                Таймеры отдыха, подсказка, какое упражнение
                                дальше, и отметка результатов после каждого
                                подхода.
                            </p>
                        </div>
                    ) : (
                        <div
                            className="program-scheme-details__run-callout"
                            role="note"
                        >
                            <p className="program-scheme-details__run-callout-text">
                                Эту схему можно проходить с таймерами отдыха —
                                для этого нужно войти на сайт.
                            </p>

                            <div className="program-scheme-details__run-callout-actions">
                                <Link
                                    to="/login"
                                    // После входа вернёмся на эту же схему.
                                    state={{
                                        from: location.pathname + location.search,
                                    }}
                                >
                                    <Button>Войти</Button>
                                </Link>

                                <Link to="/register">
                                    <Button variant="secondary">
                                        Зарегистрироваться
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )
                )
            }

            <ProgramSchemeContent scheme={scheme} />
        </div>
    );
}
