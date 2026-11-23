import { useEffect, useState } from "react";

import Select from "../ui/Select/Select";

import { getProgramVersion } from "../../api/programs";
import type { ProgramSection, ProgramStructure } from "../../types/program";

/** Что меняется в записи при выборе раздела и схемы. */
export type ProgramPartPatch = {
    programSection: string;
    programScheme: string;
    programSectionId: string;
    programSchemeId: string;
};

type ProgramPartSelectsProps = {
    programId: string;

    /** Версия программы, из структуры которой предлагаются раздел и схема. */
    versionId: string | undefined;

    sectionId: string;
    schemeId: string;

    /** Старое значение, введённое вручную до появления выбора из списка. */
    legacySection: string;
    legacyScheme: string;

    onChange: (patch: ProgramPartPatch) => void;
};

type LoadState =
    | { status: "loading" }
    | { status: "ready"; structure: ProgramStructure }
    | { status: "error" };

const NO_PART: ProgramPartPatch = {
    programSection: "",
    programScheme: "",
    programSectionId: "",
    programSchemeId: "",
};

/** Раздел без названия (автор не использует разделы) показываем по номеру. */
function sectionLabel(section: ProgramSection, index: number): string {
    return section.name?.trim() || `Раздел ${index + 1}`;
}

/**
 * Необязательные «Раздел» и «Схема» записи дневника. Варианты берутся из
 * реальной структуры выбранной программы: сначала разделы, затем схемы
 * выбранного раздела. Если автор не делил программу на разделы (один
 * раздел без названия), показывается только список схем.
 */
export default function ProgramPartSelects({
    programId,
    versionId,
    sectionId,
    schemeId,
    legacySection,
    legacyScheme,
    onChange,
}: ProgramPartSelectsProps) {
    const [state, setState] = useState<LoadState>({ status: "loading" });

    useEffect(() => {
        if (!versionId) {
            // У программы нет опубликованной версии — выбирать не из чего.
            setState({
                status: "ready",
                structure: { sections: [] },
            });
            return;
        }

        let cancelled = false;

        setState({ status: "loading" });

        getProgramVersion(programId, versionId)
            .then((version) => {
                if (!cancelled) {
                    setState({
                        status: "ready",
                        structure: version.structure,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState({ status: "error" });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [programId, versionId]);

    const hasLegacyText =
        !sectionId && !schemeId && (legacySection || legacyScheme);

    const legacyNote = hasLegacyText ? (
        <p className="workout-entry-form__section-lead">
            Раньше указано вручную:{" "}
            {[
                legacySection && `раздел «${legacySection}»`,
                legacyScheme && `схема «${legacyScheme}»`,
            ]
                .filter(Boolean)
                .join(", ")}
            . Чтобы заменить, выберите из списка.
        </p>
    ) : null;

    if (state.status === "loading") {
        return (
            <>
                <p className="workout-entry-form__section-lead">
                    Загружаем разделы и схемы программы…
                </p>
                {legacyNote}
            </>
        );
    }

    if (state.status === "error") {
        // Выбор по-прежнему необязателен: запись можно сохранить так.
        return (
            <p className="workout-entry-form__section-lead">
                Не удалось загрузить разделы и схемы программы. Раздел и
                схему можно указать позже, при редактировании записи.
            </p>
        );
    }

    const { sections } = state.structure;
    const hasSchemes = sections.some((section) => section.schemes.length > 0);

    if (!hasSchemes) {
        return (
            <>
                <p className="workout-entry-form__section-lead">
                    В этой программе пока нет схем, поэтому выбрать нечего.
                </p>
                {legacyNote}
            </>
        );
    }

    // Один раздел без названия: слой разделов скрываем, схемы — сразу.
    const isSingleUnnamedSection =
        sections.length === 1 && !sections[0].name?.trim();

    const activeSection: ProgramSection | undefined = isSingleUnnamedSection
        ? sections[0]
        : sections.find((section) => section.id === sectionId);

    function handleSectionChange(value: string) {
        const section = sections.find((item) => item.id === value);

        onChange(
            section
                ? {
                      ...NO_PART,
                      programSectionId: section.id,
                      programSection: section.name?.trim() ?? "",
                  }
                : NO_PART
        );
    }

    function handleSchemeChange(value: string) {
        const scheme = activeSection?.schemes.find((item) => item.id === value);

        if (!activeSection) {
            return;
        }

        if (!scheme) {
            // Схему сбросили — раздел остаётся выбранным (если он есть).
            onChange({
                ...NO_PART,
                programSectionId: isSingleUnnamedSection
                    ? ""
                    : activeSection.id,
                programSection: isSingleUnnamedSection
                    ? ""
                    : activeSection.name?.trim() ?? "",
            });
            return;
        }

        onChange({
            programSectionId: activeSection.id,
            programSection: activeSection.name?.trim() ?? "",
            programSchemeId: scheme.id,
            programScheme: scheme.name.trim(),
        });
    }

    return (
        <>
            {legacyNote}

            {!isSingleUnnamedSection && (
                <Select
                    id="programSection"
                    label="Раздел (необязательно)"
                    emptyOptionLabel="Не выбран"
                    options={sections
                        .filter((section) => section.schemes.length > 0)
                        .map((section) => ({
                            value: section.id,
                            label: sectionLabel(
                                section,
                                sections.indexOf(section)
                            ),
                        }))}
                    value={sectionId}
                    onChange={(e) => handleSectionChange(e.target.value)}
                />
            )}

            {activeSection && (
                <Select
                    id="programScheme"
                    label="Схема (необязательно)"
                    emptyOptionLabel="Не выбрана"
                    options={activeSection.schemes.map((scheme, index) => ({
                        value: scheme.id,
                        label: scheme.name.trim() || `Схема ${index + 1}`,
                    }))}
                    value={schemeId}
                    onChange={(e) => handleSchemeChange(e.target.value)}
                />
            )}
        </>
    );
}
