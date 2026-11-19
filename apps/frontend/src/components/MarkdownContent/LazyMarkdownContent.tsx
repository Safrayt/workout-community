import { lazy, Suspense } from "react";

// Разбор Markdown подгружается отдельным файлом только там, где есть
// статья или предпросмотр, и не раздувает основной бандл сайта.
const MarkdownContent = lazy(() => import("./MarkdownContent"));

type LazyMarkdownContentProps = {
    source: string;
    preserveLineBreaks?: boolean;
};

export default function LazyMarkdownContent({
    source,
    preserveLineBreaks,
}: LazyMarkdownContentProps) {
    return (
        <Suspense fallback={<p className="markdown__loading">Загрузка…</p>}>
            <MarkdownContent
                source={source}
                preserveLineBreaks={preserveLineBreaks}
            />
        </Suspense>
    );
}
