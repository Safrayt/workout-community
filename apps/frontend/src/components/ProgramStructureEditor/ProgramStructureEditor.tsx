import { useState } from "react";

import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Button from "../ui/Button/Button";

import "../../styles/components/program-structure-editor.css";

import { generateLocalId } from "../../api/mappers/program";
import type {
    ProgramBlock,
    ProgramScheme,
    ProgramSection,
    ProgramStructure,
} from "../../types/program";

// =====================================================================
// Общие мелкие помощники для "добавить / удалить / переставить
// местами" внутри массива — используются на всех трёх уровнях
// вложенности (разделы, схемы, блоки) и для списка упражнений.
// Явные кнопки "вверх/вниз" вместо drag-and-drop — в проекте нигде
// больше нет перетаскивания (см. ComplexForm.tsx со star_conditions),
// так что это осознанный выбор в пользу единообразия, а не упрощение
// от нехватки времени.
// =====================================================================

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
        return items;
    }

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    return next;
}

function ReorderButtons({
    index,
    count,
    onMove,
}: {
    index: number;
    count: number;
    onMove: (direction: -1 | 1) => void;
}) {
    return (
        <div className="program-structure-editor__reorder">
            <button
                type="button"
                className="program-structure-editor__icon-button"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                aria-label="Переместить выше"
            >
                ↑
            </button>

            <button
                type="button"
                className="program-structure-editor__icon-button"
                disabled={index === count - 1}
                onClick={() => onMove(1)}
                aria-label="Переместить ниже"
            >
                ↓
            </button>
        </div>
    );
}

/**
 * Сворачивание — чисто состояние экрана, не часть данных структуры
 * (см. types/program.ts): один и тот же раздел/схема может быть
 * свёрнут у одного автора и развёрнут у другого, ничего из этого не
 * сохраняется на сервере.
 */
function CollapseToggle({
    isCollapsed,
    onToggle,
    label,
}: {
    isCollapsed: boolean;
    onToggle: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            className="program-structure-editor__collapse-toggle"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? `Развернуть ${label}` : `Свернуть ${label}`}
        >
            {isCollapsed ? "▸" : "▾"}
        </button>
    );
}

// =====================================================================
// Упражнения (п.14-15 документа) — обычный текст, порядок фиксирует
// автор, система его не интерпретирует.
// =====================================================================

function ExerciseListEditor({
    exercises,
    onChange,
}: {
    exercises: string[];
    onChange: (exercises: string[]) => void;
}) {
    function updateExercise(index: number, value: string) {
        onChange(exercises.map((item, i) => (i === index ? value : item)));
    }

    function removeExercise(index: number) {
        onChange(exercises.filter((_, i) => i !== index));
    }

    function moveExercise(index: number, direction: -1 | 1) {
        onChange(moveItem(exercises, index, direction));
    }

    return (
        <div className="program-structure-editor__exercises">
            <span className="program-structure-editor__field-label">
                Упражнения
            </span>

            {
                exercises.map((exercise, index) => (
                    <div
                        key={index}
                        className="program-structure-editor__exercise-row"
                    >
                        <span className="program-structure-editor__exercise-index">
                            {index + 1}.
                        </span>

                        <Input
                            aria-label={`Упражнение ${index + 1}`}
                            value={exercise}
                            onChange={(event) =>
                                updateExercise(index, event.target.value)
                            }
                            placeholder="Например: Подтягивания"
                        />

                        <ReorderButtons
                            index={index}
                            count={exercises.length}
                            onMove={(direction) =>
                                moveExercise(index, direction)
                            }
                        />

                        <button
                            type="button"
                            className="program-structure-editor__remove-button"
                            onClick={() => removeExercise(index)}
                        >
                            Удалить
                        </button>
                    </div>
                ))
            }

            <Button
                type="button"
                variant="outline"
                onClick={() => onChange([...exercises, ""])}
            >
                Добавить упражнение
            </Button>
        </div>
    );
}

// =====================================================================
// Блок (п.12-17) — в интерфейсе называется "Комплекс" (более
// привычное тренирующимся слово для той же сущности; название полей
// в коде и на бэкенде не меняем). Название обязательно, всё
// остальное свободный текст автора. Комплексы не сворачиваются — их
// и так не бывает много внутри одной схемы, в отличие от разделов и
// схем самой программы.
// =====================================================================

function BlockEditor({
    block,
    onChange,
}: {
    block: ProgramBlock;
    onChange: (block: ProgramBlock) => void;
}) {
    return (
        <div className="program-structure-editor__block">
            <Input
                label="Название комплекса"
                value={block.title}
                onChange={(event) =>
                    onChange({ ...block, title: event.target.value })
                }
                placeholder="Например: Комплекс 1, Финишер, Турник…"
            />

            <ExerciseListEditor
                exercises={block.exercises}
                onChange={(exercises) => onChange({ ...block, exercises })}
            />

            <Input
                label="Схема / описание выполнения (необязательно)"
                value={block.scheme ?? ""}
                onChange={(event) =>
                    onChange({ ...block, scheme: event.target.value })
                }
                placeholder="Например: 5 × 10 или 4 круга по 10+5+5"
            />

            <Textarea
                id={`block-note-${block.id}`}
                label="Примечание автора (необязательно)"
                value={block.note ?? ""}
                onChange={(event) =>
                    onChange({ ...block, note: event.target.value })
                }
                rows={2}
            />

            <Input
                label="Отдых (необязательно)"
                value={block.rest ?? ""}
                onChange={(event) =>
                    onChange({ ...block, rest: event.target.value })
                }
                placeholder="Например: 60-90 секунд или полное восстановление"
            />
        </div>
    );
}

function BlockListEditor({
    blocks,
    onChange,
}: {
    blocks: ProgramBlock[];
    onChange: (blocks: ProgramBlock[]) => void;
}) {
    function updateBlock(index: number, block: ProgramBlock) {
        onChange(blocks.map((item, i) => (i === index ? block : item)));
    }

    function removeBlock(index: number) {
        onChange(blocks.filter((_, i) => i !== index));
    }

    function moveBlock(index: number, direction: -1 | 1) {
        onChange(moveItem(blocks, index, direction));
    }

    function addBlock() {
        onChange([
            ...blocks,
            {
                id: generateLocalId("block"),
                title: "",
                exercises: [],
            },
        ]);
    }

    return (
        <div className="program-structure-editor__blocks">
            {
                blocks.map((block, index) => (
                    <div
                        key={block.id}
                        className="program-structure-editor__block-wrapper"
                    >
                        <div className="program-structure-editor__item-header">
                            <span className="program-structure-editor__item-title">
                                Комплекс {index + 1}
                            </span>

                            <ReorderButtons
                                index={index}
                                count={blocks.length}
                                onMove={(direction) =>
                                    moveBlock(index, direction)
                                }
                            />

                            <button
                                type="button"
                                className="program-structure-editor__remove-button"
                                onClick={() => removeBlock(index)}
                            >
                                Удалить комплекс
                            </button>
                        </div>

                        <BlockEditor
                            block={block}
                            onChange={(updated) => updateBlock(index, updated)}
                        />
                    </div>
                ))
            }

            <Button type="button" variant="outline" onClick={addBlock}>
                Добавить комплекс
            </Button>
        </div>
    );
}

// =====================================================================
// Схема (п.11) — одна тренировочная последовательность из одного или
// нескольких блоков. Своё собственное состояние "свёрнута/развёрнута"
// живёт в SchemeItem, а не в SchemeEditor — так тело схемы можно не
// рендерить вовсе, пока она свёрнута.
// =====================================================================

function SchemeEditor({
    scheme,
    onChange,
}: {
    scheme: ProgramScheme;
    onChange: (scheme: ProgramScheme) => void;
}) {
    return (
        <div className="program-structure-editor__scheme">
            <Input
                label="Название схемы"
                value={scheme.name}
                onChange={(event) =>
                    onChange({ ...scheme, name: event.target.value })
                }
                placeholder="Например: Тренировка A"
            />

            <Textarea
                id={`scheme-description-${scheme.id}`}
                label="Описание (необязательно)"
                value={scheme.description ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, description: event.target.value })
                }
                rows={2}
            />

            <BlockListEditor
                blocks={scheme.blocks}
                onChange={(blocks) => onChange({ ...scheme, blocks })}
            />

            <Textarea
                id={`scheme-note-${scheme.id}`}
                label="Примечание (необязательно)"
                value={scheme.note ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, note: event.target.value })
                }
                rows={2}
            />

            <Input
                label="Дополнительные материалы (необязательно)"
                value={scheme.extraMaterials ?? ""}
                onChange={(event) =>
                    onChange({ ...scheme, extraMaterials: event.target.value })
                }
                placeholder="Например, ссылка на видео с пояснением"
            />
        </div>
    );
}

function SchemeItem({
    scheme,
    index,
    count,
    onChange,
    onRemove,
    onMove,
}: {
    scheme: ProgramScheme;
    index: number;
    count: number;
    onChange: (scheme: ProgramScheme) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="program-structure-editor__scheme-wrapper">
            <div className="program-structure-editor__item-header">
                <CollapseToggle
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed((current) => !current)}
                    label="схему"
                />

                <span className="program-structure-editor__item-title">
                    Схема {index + 1}
                    {scheme.name && `: ${scheme.name}`}
                </span>

                <ReorderButtons index={index} count={count} onMove={onMove} />

                <button
                    type="button"
                    className="program-structure-editor__remove-button"
                    onClick={onRemove}
                >
                    Удалить схему
                </button>
            </div>

            {
                !isCollapsed && (
                    <SchemeEditor scheme={scheme} onChange={onChange} />
                )
            }
        </div>
    );
}

function SchemeListEditor({
    schemes,
    onChange,
}: {
    schemes: ProgramScheme[];
    onChange: (schemes: ProgramScheme[]) => void;
}) {
    function updateScheme(index: number, scheme: ProgramScheme) {
        onChange(schemes.map((item, i) => (i === index ? scheme : item)));
    }

    function removeScheme(index: number) {
        onChange(schemes.filter((_, i) => i !== index));
    }

    function moveScheme(index: number, direction: -1 | 1) {
        onChange(moveItem(schemes, index, direction));
    }

    function addScheme() {
        onChange([
            ...schemes,
            {
                id: generateLocalId("scheme"),
                name: "",
                blocks: [],
            },
        ]);
    }

    return (
        <div className="program-structure-editor__schemes">
            {
                schemes.map((scheme, index) => (
                    <SchemeItem
                        key={scheme.id}
                        scheme={scheme}
                        index={index}
                        count={schemes.length}
                        onChange={(updated) => updateScheme(index, updated)}
                        onRemove={() => removeScheme(index)}
                        onMove={(direction) => moveScheme(index, direction)}
                    />
                ))
            }

            <Button type="button" variant="outline" onClick={addScheme}>
                Добавить схему
            </Button>
        </div>
    );
}

// =====================================================================
// Структура целиком — разделы необязательны (п.10). Пока раздел один
// и без названия, он не показывается как отдельный уровень — только
// схемы напрямую; это внутреннее представление "без разделов", как
// описано в types/program.ts у ProgramSection.
// =====================================================================

function SectionItem({
    section,
    index,
    count,
    onChange,
    onRemove,
    onMove,
}: {
    section: ProgramSection;
    index: number;
    count: number;
    onChange: (section: ProgramSection) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="program-structure-editor__section">
            <div className="program-structure-editor__item-header">
                <CollapseToggle
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed((current) => !current)}
                    label="раздел"
                />

                <Input
                    aria-label={`Название раздела ${index + 1}`}
                    value={section.name ?? ""}
                    onChange={(event) =>
                        onChange({ ...section, name: event.target.value })
                    }
                    placeholder="Например: Неделя 1"
                />

                <ReorderButtons index={index} count={count} onMove={onMove} />

                <button
                    type="button"
                    className="program-structure-editor__remove-button"
                    onClick={onRemove}
                >
                    Удалить раздел
                </button>
            </div>

            {
                !isCollapsed && (
                    <SchemeListEditor
                        schemes={section.schemes}
                        onChange={(schemes) =>
                            onChange({ ...section, schemes })
                        }
                    />
                )
            }
        </div>
    );
}

type ProgramStructureEditorProps = {
    value: ProgramStructure;
    onChange: (value: ProgramStructure) => void;
};

export default function ProgramStructureEditor({
    value,
    onChange,
}: ProgramStructureEditorProps) {
    const sections =
        value.sections.length > 0
            ? value.sections
            : [{ id: generateLocalId("section"), schemes: [] }];

    const usesSections = sections.length > 1 || Boolean(sections[0]?.name);

    function updateSections(nextSections: ProgramSection[]) {
        onChange({ sections: nextSections });
    }

    function updateSection(index: number, section: ProgramSection) {
        updateSections(
            sections.map((item, i) => (i === index ? section : item))
        );
    }

    function enableSections() {
        // Даём первому (единственному) разделу имя по умолчанию — до
        // этого он был "безымянным" и представлял собой всю
        // программу целиком (см. комментарий выше).
        updateSections([
            { ...sections[0], name: sections[0].name || "Раздел 1" },
            { id: generateLocalId("section"), name: "Раздел 2", schemes: [] },
        ]);
    }

    function disableSections() {
        // Возможно только когда раздел остался ровно один — иначе
        // непонятно, в каком порядке объединять их схемы, и это
        // выглядело бы как случайная потеря структуры автора.
        updateSections([{ ...sections[0], name: undefined }]);
    }

    function removeSection(index: number) {
        const next = sections.filter((_, i) => i !== index);
        updateSections(next.length > 0 ? next : [
            { id: generateLocalId("section"), schemes: [] },
        ]);
    }

    function moveSection(index: number, direction: -1 | 1) {
        updateSections(moveItem(sections, index, direction));
    }

    function addSection() {
        updateSections([
            ...sections,
            {
                id: generateLocalId("section"),
                name: `Раздел ${sections.length + 1}`,
                schemes: [],
            },
        ]);
    }

    if (!usesSections) {
        return (
            <div className="program-structure-editor">
                <SchemeListEditor
                    schemes={sections[0].schemes}
                    onChange={(schemes) =>
                        updateSection(0, { ...sections[0], schemes })
                    }
                />

                <p className="program-structure-editor__hint">
                    Если программа рассчитана на несколько недель или циклов,
                    можно разбить её на разделы.
                </p>

                <Button type="button" variant="outline" onClick={enableSections}>
                    Разбить на разделы
                </Button>
            </div>
        );
    }

    return (
        <div className="program-structure-editor">
            {
                sections.map((section, index) => (
                    <SectionItem
                        key={section.id}
                        section={section}
                        index={index}
                        count={sections.length}
                        onChange={(updated) => updateSection(index, updated)}
                        onRemove={() => removeSection(index)}
                        onMove={(direction) => moveSection(index, direction)}
                    />
                ))
            }

            <div className="program-structure-editor__section-actions">
                <Button type="button" variant="outline" onClick={addSection}>
                    Добавить раздел
                </Button>

                {
                    sections.length === 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={disableSections}
                        >
                            Убрать разделы
                        </Button>
                    )
                }
            </div>
        </div>
    );
}
