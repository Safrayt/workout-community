import { Link } from "react-router-dom";

import "../../styles/components/program-structure-view.css";

import type { ProgramScheme, ProgramStructure } from "../../types/program";

import { pluralizeRu } from "../../utils/pluralize";

type ProgramStructureViewProps = {
    structure: ProgramStructure;

    /**
     * Адрес, к которому добавляется "/schemes/<id схемы>": страница
     * программы передаёт "/programs/<id>" (схемы текущей версии), страница
     * версии — "/programs/<id>/versions/<id версии>".
     */
    schemeLinkBase: string;
};

/**
 * Оглавление программы: разделы (если автор их завёл) и схемы со
 * ссылками на их страницы (pages/ProgramSchemeDetails). Содержимое
 * схем — комплексы, упражнения, мышцы — здесь не показываем: оно на
 * странице схемы, а эта страница остаётся короткой (раньше она была
 * одной длинной простынёй). Используется и на странице программы
 * (для актуальной версии), и при просмотре конкретной версии (см.
 * pages/ProgramDetails, pages/ProgramVersionDetails).
 *
 * Разделы сворачиваются на нативных <details>/<summary> и по умолчанию
 * развёрнуты — чтобы сразу было видно, какие в них схемы.
 */
export default function ProgramStructureView({
    structure,
    schemeLinkBase,
}: ProgramStructureViewProps) {
    const hasNamedSections = structure.sections.some((section) => section.name);

    if (structure.sections.every((section) => section.schemes.length === 0)) {
        return (
            <p className="program-structure-view__empty">
                Автор пока не наполнил программу содержимым.
            </p>
        );
    }

    function describeScheme(scheme: ProgramScheme): string {
        const blocksCount = scheme.blocks.length;
        const exercisesCount = scheme.blocks.reduce(
            (sum, block) => sum + block.items.length,
            0
        );

        const parts: string[] = [];

        if (blocksCount > 0) {
            parts.push(
                `${blocksCount} ${pluralizeRu(blocksCount, ["комплекс", "комплекса", "комплексов"])}`
            );
        }

        if (exercisesCount > 0) {
            parts.push(
                `${exercisesCount} ${pluralizeRu(exercisesCount, ["упражнение", "упражнения", "упражнений"])}`
            );
        }

        return parts.join(" · ");
    }

    function renderSchemes(schemes: ProgramScheme[]) {
        return schemes.map((scheme) => {
            const meta = describeScheme(scheme);

            return (
                <Link
                    key={scheme.id}
                    to={`${schemeLinkBase}/schemes/${scheme.id}`}
                    className="program-structure-view__scheme"
                >
                    <span className="program-structure-view__scheme-title">
                        {scheme.name || "Схема"}
                    </span>

                    {
                        meta && (
                            <span className="program-structure-view__scheme-meta">
                                {meta}
                            </span>
                        )
                    }

                    {
                        scheme.description && (
                            <span className="program-structure-view__scheme-description">
                                {scheme.description}
                            </span>
                        )
                    }
                </Link>
            );
        });
    }

    return (
        <div className="program-structure-view">
            {
                structure.sections.map((section) => {
                    if (hasNamedSections && section.name) {
                        return (
                            <details
                                key={section.id}
                                className="program-structure-view__section"
                                open
                            >
                                <summary className="program-structure-view__section-summary">
                                    <span
                                        className="program-structure-view__section-icon"
                                        aria-hidden="true"
                                    />

                                    <h2 className="program-structure-view__section-title">
                                        {section.name}
                                    </h2>
                                </summary>

                                <div className="program-structure-view__section-content">
                                    {renderSchemes(section.schemes)}
                                </div>
                            </details>
                        );
                    }

                    // Программа без разделов (п.10, варианты 1-2) —
                    // схемы показываются напрямую, без обёртки уровня
                    // раздела, которого автор не заводил.
                    return (
                        <div key={section.id} className="program-structure-view__flat-section">
                            {renderSchemes(section.schemes)}
                        </div>
                    );
                })
            }
        </div>
    );
}
