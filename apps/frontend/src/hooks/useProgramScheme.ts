import { useEffect, useState } from "react";

import { getProgram, getProgramVersion } from "../api/programs";
import type {
    Program,
    ProgramScheme,
    ProgramSection,
    ProgramVersion,
} from "../types/program";

type LoadResult = {
    key: string;
    program?: Program;
    version?: ProgramVersion;
};

export type ProgramSchemeData =
    | { status: "loading" }
    | { status: "missing"; program?: Program; version?: ProgramVersion }
    | {
          status: "ready";
          program: Program;
          version: ProgramVersion;
          section: ProgramSection;
          scheme: ProgramScheme;
      };

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

/**
 * Схема программы по адресу страницы: текущая версия программы или
 * конкретная (versionId). Так же загружает данные страница схемы.
 */
export function useProgramScheme(
    id: string | undefined,
    versionId: string | undefined,
    schemeId: string | undefined
): ProgramSchemeData {
    // Результат помнит, для какого адреса он получен: пока он не
    // совпадает с текущим, показываем «Загрузка…», а не данные
    // предыдущей страницы.
    const requestKey = `${id}/${versionId ?? ""}`;
    const [result, setResult] = useState<LoadResult | undefined>(undefined);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        getProgram(id)
            .then(async (loadedProgram) => {
                const targetVersionId =
                    versionId ?? loadedProgram.currentVersionId;

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

    if (result?.key !== requestKey) {
        return { status: "loading" };
    }

    const { program, version } = result;
    const found = version ? findScheme(version, schemeId) : undefined;

    if (!program || !version || !found) {
        return { status: "missing", program, version };
    }

    return {
        status: "ready",
        program,
        version,
        section: found.section,
        scheme: found.scheme,
    };
}
