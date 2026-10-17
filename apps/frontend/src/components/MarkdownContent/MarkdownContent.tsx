import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

import { resolveMediaUrl } from "../../api/media";

import "../../styles/components/markdown-content.css";

/**
 * Картинки статей — только загруженные через редактор (тот же шаблон
 * имени проверяет бэкенд, см. ARTICLE_IMAGE_URL_RE в
 * app/models_article.py). Чужие картинки не показываем: это и пиксели
 * слежения за читателями, и файлы, которые однажды пропадут.
 */
const ARTICLE_IMAGE_PATH = /^\/uploads\/articles\/[0-9a-f]{32}\.(?:jpg|png|webp)$/;

/** react-markdown передаёт в компонент служебное поле node — на DOM-элемент его переносить нельзя. */
function omitNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
    const rest = { ...props };

    delete rest.node;

    return rest;
}

/**
 * Название статьи — это h2 страницы (Section), поэтому заголовки в
 * тексте начинаются с h3: "#" и "##" оба дают h3, дальше уровень на
 * единицу ниже, чем в разметке.
 */
function heading(tag: "h3" | "h4" | "h5" | "h6"): Components["h1"] {
    const Tag = tag;

    return (props) => <Tag {...omitNode(props)} />;
}

const components: Components = {
    h1: heading("h3"),
    h2: heading("h3"),
    h3: heading("h4"),
    h4: heading("h5"),
    h5: heading("h6"),
    h6: heading("h6"),

    a: (props) => {
        const { href, children, ...rest } = omitNode(props);

        // Ссылка на страницу этого же сайта — обычный переход без
        // перезагрузки.
        if (href && href.startsWith("/") && !href.startsWith("//")) {
            return <Link to={href}>{children}</Link>;
        }

        // Внешняя ссылка (в том числе на видео) открывается в новой
        // вкладке и не передаёт странице-цели ни окно, ни источник
        // перехода.
        if (href && /^https?:\/\//i.test(href)) {
            return (
                <a
                    {...rest}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                >
                    {children}
                </a>
            );
        }

        return (
            <a {...rest} href={href}>
                {children}
            </a>
        );
    },

    img: (props) => {
        const { src, alt } = omitNode(props);

        const url =
            typeof src === "string" && ARTICLE_IMAGE_PATH.test(src)
                ? resolveMediaUrl(src)
                : undefined;

        if (!url) {
            return (
                <span className="markdown__image-blocked">
                    [картинка недоступна]
                </span>
            );
        }

        return (
            <img
                className="markdown__image"
                src={url}
                alt={alt ?? ""}
                loading="lazy"
            />
        );
    },

    // Широкая таблица прокручивается внутри своей рамки, а не растягивает страницу.
    table: (props) => (
        <div className="markdown__table-wrap">
            <table {...omitNode(props)} />
        </div>
    ),
};

type MarkdownContentProps = {
    /** Текст статьи в Markdown. */
    source: string;
};

/**
 * Показывает текст статьи. react-markdown строит из Markdown обычные
 * React-элементы, а не HTML-строку, поэтому "вставить скрипт" через
 * текст нельзя; сырой HTML в тексте выводится как обычный текст.
 * Опасные адреса ссылок (javascript: и т. п.) библиотека отсекает сама.
 *
 * Подключается через LazyMarkdownContent — библиотека разбора
 * Markdown довольно тяжёлая и нужна только на страницах статей.
 */
export default function MarkdownContent({ source }: MarkdownContentProps) {
    return (
        <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {source}
            </ReactMarkdown>
        </div>
    );
}
