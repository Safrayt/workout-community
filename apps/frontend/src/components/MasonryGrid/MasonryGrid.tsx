import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Высота одной "строки" вспомогательной сетки. Каждый элемент
 * растягивается на столько таких строк, сколько занимает его высота.
 * 4px — компромисс: отступы между карточками получаются с точностью
 * до 3px, а общее число строк остаётся далеко от лимита браузеров
 * (10 000 дорожек) даже при сотне карточек в ленте.
 */
const ROW_UNIT_PX = 4;

type MasonryGridProps = {
    className?: string;
    children: ReactNode;
};

function getColumnCount(container: HTMLElement): number {
    const template = getComputedStyle(container).gridTemplateColumns;

    if (!template || template === "none") {
        return 1;
    }

    return template.trim().split(/\s+/).length;
}

function layoutItem(item: HTMLElement, isSingleColumn: boolean) {
    // В одну колонку "плотность" не нужна — обычные строки по
    // высоте контента, без растягивания на вспомогательные строки.
    if (isSingleColumn) {
        item.style.gridRowEnd = "";
        return;
    }

    const style = getComputedStyle(item);

    const totalHeight =
        item.offsetHeight +
        (parseFloat(style.marginTop) || 0) +
        (parseFloat(style.marginBottom) || 0);

    const span = Math.max(1, Math.ceil(totalHeight / ROW_UNIT_PX));

    item.style.gridRowEnd = `span ${span}`;
}

/**
 * Плотная раскладка карточек ("masonry") с сохранением порядка.
 *
 * Элементы идут в DOM в своём исходном порядке (для ленты —
 * хронологическом), а сетка сама кладёт каждый следующий в самое
 * высокое свободное место, то есть в текущую самую короткую колонку.
 * Поэтому пустых промежутков почти нет, а порядок при этом не
 * ломается: ни одна карточка никогда не оказывается выше карточки,
 * которая в списке стоит раньше неё (в отличие от CSS-колонок, где
 * колонки заполняются по очереди сверху вниз).
 *
 * Как это работает: сетка задаётся мелкими строками (см. CSS,
 * grid-auto-rows), а этот компонент измеряет высоту каждой
 * карточки и выставляет ей grid-row-end: span N. Пересчёт идёт при
 * изменении размера карточки (загрузились фото, изменилась ширина
 * окна) и при добавлении новых карточек.
 *
 * Чистого CSS-решения (grid-template-rows: masonry) пока нет в
 * стабильных версиях всех браузеров.
 */
export default function MasonryGrid({
    className,
    children,
}: MasonryGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Без массива зависимостей: нужно пересчитывать после каждого
    // рендера — состав карточек (children) мог измениться.
    useLayoutEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        function layoutAll() {
            const target = containerRef.current;

            if (!target) {
                return;
            }

            const isSingleColumn = getColumnCount(target) <= 1;

            Array.from(target.children).forEach((child) =>
                layoutItem(child as HTMLElement, isSingleColumn)
            );
        }

        layoutAll();

        const observer = new ResizeObserver(layoutAll);

        observer.observe(container);
        Array.from(container.children).forEach((child) =>
            observer.observe(child)
        );

        return () => observer.disconnect();
    });

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
