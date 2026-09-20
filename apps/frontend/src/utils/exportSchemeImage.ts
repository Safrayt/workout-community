import type { ProgramScheme } from "../types/program";

// Экспортируем в 2x относительно логической ширины разметки — иначе
// текст на скачанной картинке выглядит смазанным на ретина-экранах.
const WIDTH = 800;
const SCALE = 2;
const PADDING = 28;

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
 */

type Line = { text: string; font: string; color: string };

type DrawCommand =
    | { kind: "rect"; x: number; y: number; width: number; height: number; color: string }
    | { kind: "text"; x: number; y: number; text: string; font: string; color: string };

/** Разбивает текст на строки по ширине — использует measureText того
 *  же контекста, что и итоговая отрисовка, так что перенос совпадает
 *  с тем, что реально поместится. */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number
): string[] {
    ctx.font = font;

    const words = text.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return [];
    }

    const lines: string[] = [];
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
 * Строит план отрисовки (список примитивов с готовыми координатами) и
 * заодно возвращает итоговую высоту карточки — высота зависит от
 * количества комплексов/упражнений и от того, где перенеслись строки,
 * поэтому её нельзя знать заранее, не проделав ту же раскладку.
 */
function buildLayout(
    ctx: CanvasRenderingContext2D,
    scheme: ProgramScheme,
    programTitle: string,
    versionNumber?: string
): { commands: DrawCommand[]; height: number } {
    const commands: DrawCommand[] = [];
    const contentWidth = WIDTH - PADDING * 2;

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

    scheme.blocks.forEach((block, index) => {
        const blockPaddingX = 16;
        const blockPaddingY = 14;
        const blockContentX = PADDING + blockPaddingX;
        const blockContentWidth = contentWidth - blockPaddingX * 2;

        const titleLines = wrapLines(
            ctx,
            block.title || `Комплекс ${index + 1}`,
            `700 16px ${FONT_FAMILY}`,
            COLOR_TEXT,
            blockContentWidth
        );

        const exerciseLineGroups = block.exercises.map((exercise, exerciseIndex) =>
            wrapLines(
                ctx,
                `${exerciseIndex + 1}. ${exercise}`,
                `14px ${FONT_FAMILY}`,
                COLOR_TEXT,
                blockContentWidth
            )
        );

        const schemeLines = block.scheme
            ? wrapLines(
                  ctx,
                  block.scheme,
                  `600 14px ${FONT_FAMILY}`,
                  COLOR_TEXT,
                  blockContentWidth
              )
            : [];

        const noteLines = block.note
            ? wrapLines(
                  ctx,
                  `Примечание: ${block.note}`,
                  `14px ${FONT_FAMILY}`,
                  COLOR_SECONDARY,
                  blockContentWidth
              )
            : [];

        const restLines = block.rest
            ? wrapLines(
                  ctx,
                  `Отдых: ${block.rest}`,
                  `14px ${FONT_FAMILY}`,
                  COLOR_SECONDARY,
                  blockContentWidth
              )
            : [];

        // Высоты считаем явно по группам, а не одним плоским списком —
        // между заголовком/упражнениями/схемой/примечанием/отдыхом
        // нужны разные отступы, как в обычном отображении структуры.
        let blockHeight = blockPaddingY * 2;
        blockHeight += titleLines.length * 22;

        if (exerciseLineGroups.length > 0) {
            blockHeight += 6;
            for (const group of exerciseLineGroups) {
                blockHeight += group.length * 20;
            }
        }

        if (schemeLines.length > 0) {
            blockHeight += 8 + schemeLines.length * 20;
        }

        if (noteLines.length > 0) {
            blockHeight += 6 + noteLines.length * 19;
        }

        if (restLines.length > 0) {
            blockHeight += 6 + restLines.length * 19;
        }

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

        for (const line of titleLines) {
            commands.push({ kind: "text", x: blockContentX, y: innerY, ...line });
            innerY += 22;
        }

        if (exerciseLineGroups.length > 0) {
            innerY += 6;
            for (const group of exerciseLineGroups) {
                for (const line of group) {
                    commands.push({
                        kind: "text",
                        x: blockContentX,
                        y: innerY,
                        ...line,
                    });
                    innerY += 20;
                }
            }
        }

        if (schemeLines.length > 0) {
            innerY += 8;
            for (const line of schemeLines) {
                commands.push({ kind: "text", x: blockContentX, y: innerY, ...line });
                innerY += 20;
            }
        }

        if (noteLines.length > 0) {
            innerY += 6;
            for (const line of noteLines) {
                commands.push({ kind: "text", x: blockContentX, y: innerY, ...line });
                innerY += 19;
            }
        }

        if (restLines.length > 0) {
            innerY += 6;
            for (const line of restLines) {
                commands.push({ kind: "text", x: blockContentX, y: innerY, ...line });
                innerY += 19;
            }
        }

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

export async function downloadSchemeAsImage(
    scheme: ProgramScheme,
    programTitle: string,
    versionNumber?: string
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
        versionNumber
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
