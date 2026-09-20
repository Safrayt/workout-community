import "../../styles/components/program-structure-view.css";

import type { ProgramStructure } from "../../types/program";

import { downloadSchemeAsImage } from "../../utils/exportSchemeImage";

type ProgramStructureViewProps = {
    structure: ProgramStructure;

    /** Нужны только для подписи на скачиваемой картинке схемы (см.
     *  utils/exportSchemeImage.ts) — на самом отображении структуры
     *  не влияют. */
    programTitle: string;

    versionNumber?: string;
};

/**
 * Только отображение — используется и на странице программы (для
 * актуальной версии), и при просмотре конкретной исторической версии
 * (см. pages/ProgramDetails, pages/ProgramVersionDetails). Никакой
 * интерпретации содержимого, просто раскладка того, что ввёл автор
 * (п.18 документа).
 *
 * Разделы и схемы сворачиваются на нативных <details>/<summary> — по
 * умолчанию раздел развёрнут (чтобы сразу было видно, какие в нём
 * схемы), а сама схема свёрнута (чтобы не показывать все комплексы и
 * упражнения программы разом — это и было исходной проблемой:
 * страница программы выглядела одной длинной простынёй).
 */
export default function ProgramStructureView({
    structure,
    programTitle,
    versionNumber,
}: ProgramStructureViewProps) {
    const hasNamedSections = structure.sections.some((section) => section.name);

    if (structure.sections.every((section) => section.schemes.length === 0)) {
        return (
            <p className="program-structure-view__empty">
                Автор пока не наполнил программу содержимым.
            </p>
        );
    }

    function renderSchemes(schemesOfSection: ProgramStructure["sections"][number]["schemes"]) {
        return schemesOfSection.map((scheme) => (
            <details
                key={scheme.id}
                className="program-structure-view__scheme"
            >
                <summary className="program-structure-view__scheme-summary">
                    <span className="program-structure-view__scheme-icon" aria-hidden="true" />

                    <span className="program-structure-view__scheme-title">
                        {scheme.name || "Схема"}
                    </span>

                    <button
                        type="button"
                        className="program-structure-view__download-button"
                        onClick={(event) => {
                            // Клик по кнопке не должен переключать
                            // раскрытие <details> — только скачивать.
                            event.preventDefault();
                            event.stopPropagation();

                            downloadSchemeAsImage(
                                scheme,
                                programTitle,
                                versionNumber
                            ).catch((error: unknown) => {
                                console.error(
                                    "Не удалось скачать схему как изображение:",
                                    error
                                );
                                window.alert(
                                    "Не удалось скачать схему. Попробуйте ещё раз."
                                );
                            });
                        }}
                    >
                        Скачать
                    </button>
                </summary>

                <div className="program-structure-view__scheme-content">
                    {
                        scheme.description && (
                            <p className="program-structure-view__scheme-description">
                                {scheme.description}
                            </p>
                        )
                    }

                    <div className="program-structure-view__blocks">
                        {
                            scheme.blocks.map((block, blockIndex) => (
                                <div
                                    key={block.id}
                                    className="program-structure-view__block"
                                >
                                    <h4 className="program-structure-view__block-title">
                                        {block.title || `Комплекс ${blockIndex + 1}`}
                                    </h4>

                                    {
                                        block.exercises.length > 0 && (
                                            <ol className="program-structure-view__exercises">
                                                {
                                                    block.exercises.map(
                                                        (exercise, index) => (
                                                            <li key={index}>
                                                                {exercise}
                                                            </li>
                                                        )
                                                    )
                                                }
                                            </ol>
                                        )
                                    }

                                    {
                                        block.scheme && (
                                            <p className="program-structure-view__block-scheme">
                                                {block.scheme}
                                            </p>
                                        )
                                    }

                                    {
                                        block.note && (
                                            <p className="program-structure-view__note">
                                                Примечание: {block.note}
                                            </p>
                                        )
                                    }

                                    {
                                        block.rest && (
                                            <p className="program-structure-view__rest">
                                                Отдых: {block.rest}
                                            </p>
                                        )
                                    }
                                </div>
                            ))
                        }
                    </div>

                    {
                        scheme.note && (
                            <p className="program-structure-view__note">
                                Примечание: {scheme.note}
                            </p>
                        )
                    }

                    {
                        scheme.extraMaterials && (
                            <p className="program-structure-view__extra-materials">
                                Дополнительные материалы: {scheme.extraMaterials}
                            </p>
                        )
                    }
                </div>
            </details>
        ));
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
