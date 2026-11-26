import type { ProgramBlock, ProgramScheme } from "../types/program";

import {
    describeAutoBlock,
    formatTarget,
    hasSupersets,
    isAutoScheme,
} from "./programAuto";
import { formatWeight } from "./performedExercises";

// Экспортируем в 2x относительно логической ширины разметки — иначе
// текст на скачанной картинке выглядит смазанным на ретина-экранах.
const WIDTH = 800;
const SCALE = 2;
const PADDING = 28;

// Ширина колонки с номером упражнения внутри комплекса.
const NUMBER_COLUMN = 30;

const COLOR_TEXT = "#1a202c";
const COLOR_SECONDARY = "#718096";
const COLOR_SCHEME_ACCENT = "#2f855a";
const COLOR_BLOCK_ACCENT = "#dd6b20";
const COLOR_BLOCK_BACKGROUND = "#fffaf0";
const COLOR_BORDER = "#e2e8f0";

const FONT_FAMILY = "sans-serif";

/**
 * Первая версия этого экспорта собирала карточку как HTML, оборачивала
 * в <svg><foreignObject> и рисовала на canvas через drawImage — рабочий
 * на вид приём, но браузер помечает canvas как "tainted" в тот момент,
 * когда на него нарисовали SVG с <foreignObject> (спецификация не
 * позволяет потом читать пиксели такого canvas — ровно это и делает
 * toDataURL). Поэтому здесь никакого HTML и никакого drawImage: только
 * штатные примитивы Canvas 2D (fillRect/fillText), которые ничего не
 * помечают и всегда экспортируются без ограничений.
 *
 * Содержимое комплексов должно совпадать с тем, что показывает страница
 * схемы (components/ProgramSchemeContent): у автоматической схемы — цели
 * упражнений, сеты, число подходов или кругов и отдых; у свободной —
 * нагрузка упражнений и текстовые «Схема» и «Отдых». Менять только
 * вместе с ней.
 */

type Line = { text: string; font: string; color: string };

type DrawCommand =
    | { kind: "rect"; x: number; y: number; width: number; height: number; color: string }
    | { kind: "text"; x: number; y: number; text: string; font: string; color: string };

/**
 * Часть содержимого комплекса: несколько строк с общим шагом, отступом
 * сверху и сдвигом по горизонтали (x — от левого края содержимого
 * комплекса). marker — номер упражнения, рисуется слева от первой строки.
 */
type Segment = {
    lines: Line[];
    lineHeight: number;
    gapBefore: number;
    x: number;
    marker?: Line & { x: number };
};

/** Разбивает текст на строки по ширине — использует measureText того
 *  же контекста, что и итоговая отрисовка, так что перенос совпадает
 *  с тем, что реально поместится. Переносы строк автора сохраняются (как
 *  на странице, где у таких текстов white-space: pre-line), а пустые
 *  строки в начале и в конце отбрасываются. */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number
): string[] {
    ctx.font = font;

    const lines: string[] = [];

    for (const paragraph of text.split(/\r?\n/)) {
        const words = paragraph.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            lines.push("");
            continue;
        }

        let currentLine = words[0];

        for (const word of words.slice(1)) {
            const candidate = `${currentLine} ${word}`;

            if (ctx.measureText(candidate).width > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = candidate;
            }
        }

        lines.push(currentLine);
    }

    while (lines.length > 0 && lines[0] === "") {
        lines.shift();
    }

    while (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
    }

    return lines;
}

function wrapLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    color: string,
    maxWidth: number
): Line[] {
    return wrapText(ctx, text, font, maxWidth).map((line) => ({
        text: line,
        font,
        color,
    }));
}

/**
 * Содержимое комплекса по порядку сверху вниз — в том же составе и
 * порядке, что на странице схемы (ProgramSchemeContent): название,
 * упражнения (у автоматической схемы — с подписями «Сет N», когда в
 * комплексе есть суперсеты, и с целью упражнения), затем строки про
 * подходы/круги и отдых (автоматическая схема) либо текст «Схема»
 * (свободная), примечание и, у свободной схемы, «Отдых».
 */
function buildBlockSegments(
    ctx: CanvasRenderingContext2D,
    block: ProgramBlock,
    blockIndex: number,
    isAuto: boolean,
    nameOf: (exerciseId: string) => string,
    typeOf: (exerciseId: string) => string | undefined,
    width: number
): Segment[] {
    const segments: Segment[] = [];

    function add(
        lines: Line[],
        lineHeight: number,
        gapBefore: number,
        x = 0,
        marker?: Segment["marker"]
    ) {
        if (lines.length > 0) {
            segments.push({ lines, lineHeight, gapBefore, x, marker });
        }
    }

    add(
        wrapLines(
            ctx,
            block.title || `Комплекс ${blockIndex + 1}`,
            `700 16px ${FONT_FAMILY}`,
            COLOR_TEXT,
            width
        ),
        22,
        0
    );

    const showSets = isAuto && hasSupersets(block);
    let setNumber = 0;

    block.items.forEach((item, itemIndex) => {
        const startsSet = itemIndex === 0 || !item.groupWithPrevious;

        if (startsSet) {
            setNumber += 1;
        }

        const hasSetLabel = showSets && startsSet;

        if (hasSetLabel) {
            add(
                [
                    {
                        text: `Сет ${setNumber}`,
                        font: `700 13px ${FONT_FAMILY}`,
                        color: COLOR_SECONDARY,
                    },
                ],
                18,
                itemIndex === 0 ? 10 : 14
            );
        }

        // Как на странице: после названия упражнения из базы — тип
        // движения (у своих упражнений текстом его нет).
        const movementType =
            item.kind === "exercise" ? typeOf(item.exerciseId) : undefined;
        const baseName =
            (item.kind === "exercise" ? nameOf(item.exerciseId) : item.text).trim() ||
            "—";
        const name = movementType ? `${baseName}  ·  ${movementType}` : baseName;
        const nameFont = `700 14px ${FONT_FAMILY}`;

        add(
            wrapLines(ctx, name, nameFont, COLOR_TEXT, width - NUMBER_COLUMN),
            20,
            hasSetLabel ? 2 : itemIndex === 0 ? 8 : 10,
            NUMBER_COLUMN,
            {
                text: String(itemIndex + 1).padStart(2, "0"),
                font: nameFont,
                color: COLOR_SECONDARY,
                x: 0,
            }
        );

        // Под названием — то, что автор задал упражнению: у
        // автоматической схемы цель (повторения, секунды, «Максимум»,
        // AMRAP, EMOM) и нагрузка, у свободной — только нагрузка.
        const details = isAuto
            ? [formatTarget(item.target), formatWeight(item.weightKg), item.load]
                  .filter(Boolean)
                  .join(" · ")
            : item.load;

        if (details) {
            add(
                wrapLines(
                    ctx,
                    details,
                    `14px ${FONT_FAMILY}`,
                    COLOR_TEXT,
                    width - NUMBER_COLUMN
                ),
                20,
                2,
                NUMBER_COLUMN
            );
        }
    });

    if (block.items.length === 0) {
        add(
            wrapLines(
                ctx,
                "В комплексе пока нет упражнений.",
                `14px ${FONT_FAMILY}`,
                COLOR_SECONDARY,
                width
            ),
            19,
            8
        );
    }

    if (isAuto) {
        describeAutoBlock(block).forEach((line, lineIndex) => {
            add(
                wrapLines(
                    ctx,
                    line,
                    lineIndex === 0
                        ? `600 14px ${FONT_FAMILY}`
                        : `14px ${FONT_FAMILY}`,
                    lineIndex === 0 ? COLOR_TEXT : COLOR_SECONDARY,
                    width
                ),
                lineIndex === 0 ? 20 : 19,
                lineIndex === 0 ? 12 : 6
            );
        });
    } else if (block.scheme) {
        add(
            wrapLines(
                ctx,
                block.scheme,
                `600 14px ${FONT_FAMILY}`,
                COLOR_TEXT,
                width
            ),
            20,
            12
        );
    }

    if (block.note) {
        add(
            wrapLines(
                ctx,
                `Примечание: ${block.note}`,
                `14px ${FONT_FAMILY}`,
                COLOR_SECONDARY,
                width
            ),
            19,
            6
        );
    }

    // У автоматической схемы отдых задан числами и уже выведен строкой
    // «Отдых: …» выше; текстовое поле block.rest — только у свободной.
    if (!isAuto && block.rest) {
        add(
            wrapLines(
                ctx,
                `Отдых: ${block.rest}`,
                `14px ${FONT_FAMILY}`,
                COLOR_SECONDARY,
                width
            ),
            19,
            6
        );
    }

    return segments;
}

/**
 * Строит план отрисовки (список примитивов с готовыми координатами) и
 * заодно возвращает итоговую высоту карточки — высота зависит от
 * количества комплексов/упражнений и от того, где перенеслись строки,
 * поэтому её нельзя знать заранее, не проделав ту же раскладку.
 */
function buildLayout(
    ctx: CanvasRenderingContext2D,
    scheme: ProgramScheme,
    programTitle: string,
    versionNumber: string | undefined,
    nameOf: (exerciseId: string) => string,
    typeOf: (exerciseId: string) => string | undefined
): { commands: DrawCommand[]; height: number } {
    const commands: DrawCommand[] = [];
    const contentWidth = WIDTH - PADDING * 2;
    const isAuto = isAutoScheme(scheme);

    let y = PADDING;

    // Подпись программы и версии — контекст, к какой программе
    // относится схема, если картинку сохранят отдельно от сайта.
    const headerText = versionNumber
        ? `${programTitle} · версия ${versionNumber}`
        : programTitle;
    const headerFont = `13px ${FONT_FAMILY}`;
    const headerLines = wrapLines(
        ctx,
        headerText,
        headerFont,
        COLOR_SECONDARY,
        contentWidth
    );
    for (const line of headerLines) {
        commands.push({ kind: "text", x: PADDING, y, ...line });
        y += 18;
    }
    y += 6;

    // Название схемы с зелёной акцентной полосой — тот же цвет, что и
    // у схемы в интерфейсе (program-structure-view.css). Название
    // может оказаться длинным, поэтому переносим его так же, как и
    // остальной текст, а не рисуем одной строкой без учёта ширины.
    const titleFont = `700 24px ${FONT_FAMILY}`;
    const titleLines = wrapLines(
        ctx,
        scheme.name || "Схема",
        titleFont,
        COLOR_TEXT,
        contentWidth - 14
    );
    const titleLineHeight = 30;
    const titleBlockHeight = titleLines.length * titleLineHeight;

    commands.push({
        kind: "rect",
        x: PADDING,
        y,
        width: 4,
        height: titleBlockHeight,
        color: COLOR_SCHEME_ACCENT,
    });
    titleLines.forEach((line, index) => {
        commands.push({
            kind: "text",
            x: PADDING + 14,
            y: y + 3 + index * titleLineHeight,
            ...line,
        });
    });
    y += titleBlockHeight + 16;

    if (scheme.description) {
        const descriptionLines = wrapLines(
            ctx,
            scheme.description,
            `15px ${FONT_FAMILY}`,
            COLOR_SECONDARY,
            contentWidth - 14
        );

        for (const line of descriptionLines) {
            commands.push({ kind: "text", x: PADDING + 14, y, ...line });
            y += 21;
        }

        y += 8;
    }


    y += 8;

    if (scheme.blocks.length === 0) {
        const lines = wrapLines(
            ctx,
            "Автор пока не добавил в схему ни одного комплекса.",
            `14px ${FONT_FAMILY}`,
            COLOR_SECONDARY,
            contentWidth
        );

        for (const line of lines) {
            commands.push({ kind: "text", x: PADDING, y, ...line });
            y += 19;
        }
    }

    scheme.blocks.forEach((block, index) => {
        const blockPaddingX = 16;
        const blockPaddingY = 14;
        const blockContentX = PADDING + blockPaddingX;
        const blockContentWidth = contentWidth - blockPaddingX * 2;

        const segments = buildBlockSegments(
            ctx,
            block,
            index,
            isAuto,
            nameOf,
            typeOf,
            blockContentWidth
        );

        // Высоту считаем заранее по тем же отступам, по которым ниже
        // рисуем: сначала нужна подложка комплекса, а текст — поверх неё.
        let blockHeight = blockPaddingY * 2;

        segments.forEach((segment, segmentIndex) => {
            blockHeight +=
                (segmentIndex === 0 ? 0 : segment.gapBefore) +
                segment.lines.length * segment.lineHeight;
        });

        if (index > 0) {
            y += 12;
        }

        commands.push({
            kind: "rect",
            x: PADDING,
            y,
            width: contentWidth,
            height: blockHeight,
            color: COLOR_BLOCK_BACKGROUND,
        });
        commands.push({
            kind: "rect",
            x: PADDING,
            y,
            width: 4,
            height: blockHeight,
            color: COLOR_BLOCK_ACCENT,
        });

        let innerY = y + blockPaddingY;

        segments.forEach((segment, segmentIndex) => {
            if (segmentIndex > 0) {
                innerY += segment.gapBefore;
            }

            if (segment.marker) {
                commands.push({
                    kind: "text",
                    x: blockContentX + segment.marker.x,
                    y: innerY,
                    text: segment.marker.text,
                    font: segment.marker.font,
                    color: segment.marker.color,
                });
            }

            for (const line of segment.lines) {
                commands.push({
                    kind: "text",
                    x: blockContentX + segment.x,
                    y: innerY,
                    ...line,
                });
                innerY += segment.lineHeight;
            }
        });

        y += blockHeight;
    });

    if (scheme.note) {
        y += 14;
        const lines = wrapLines(
            ctx,
            `Примечание: ${scheme.note}`,
            `14px ${FONT_FAMILY}`,
            COLOR_SECONDARY,
            contentWidth
        );
        for (const line of lines) {
            commands.push({ kind: "text", x: PADDING, y, ...line });
            y += 19;
        }
    }

    if (scheme.extraMaterials) {
        y += 8;
        const lines = wrapLines(
            ctx,
            `Дополнительные материалы: ${scheme.extraMaterials}`,
            `14px ${FONT_FAMILY}`,
            COLOR_SECONDARY,
            contentWidth
        );
        for (const line of lines) {
            commands.push({ kind: "text", x: PADDING, y, ...line });
            y += 19;
        }
    }

    y += PADDING;

    return { commands, height: y };
}

function slugifyFileName(value: string): string {
    const transliterated = value
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");

    return transliterated || "schema";
}

/**
 * nameOf — название упражнения из базы по id (на картинке упражнения
 * блока выводятся текстом, и «из базы», и свои); typeOf — подпись типа
 * движения (необязательно: без неё тип на картинке не показывается).
 */
export async function downloadSchemeAsImage(
    scheme: ProgramScheme,
    programTitle: string,
    versionNumber: string | undefined,
    nameOf: (exerciseId: string) => string,
    typeOf: (exerciseId: string) => string | undefined = () => undefined
): Promise<void> {
    // Первый проход — только для раскладки/измерения текста, canvas
    // сам по себе никуда не идёт и в DOM не добавляется.
    const measuringCanvas = document.createElement("canvas");
    const measuringCtx = measuringCanvas.getContext("2d");

    if (!measuringCtx) {
        throw new Error("Не удалось подготовить изображение схемы.");
    }

    const { commands, height } = buildLayout(
        measuringCtx,
        scheme,
        programTitle,
        versionNumber,
        nameOf,
        typeOf
    );

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * SCALE;
    canvas.height = height * SCALE;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Не удалось подготовить изображение схемы.");
    }

    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = "top";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, height);

    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, WIDTH - 1, height - 1);

    for (const command of commands) {
        if (command.kind === "rect") {
            ctx.fillStyle = command.color;
            ctx.fillRect(command.x, command.y, command.width, command.height);
        } else {
            ctx.font = command.font;
            ctx.fillStyle = command.color;
            ctx.fillText(command.text, command.x, command.y);
        }
    }

    const pngDataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = pngDataUrl;
    link.download = `${slugifyFileName(scheme.name || programTitle)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
