import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

import ArticleCarousel from "../ArticleCarousel/ArticleCarousel";

import { resolveMediaUrl } from "../../api/media";
import {
    CAROUSEL_LANGUAGE,
    parseCarouselSource,
} from "../../utils/articleCarousel";

import "../../styles/components/markdown-content.css";

/**
 * Картинки статей и описаний программ — только загруженные через
 * редактор (тот же шаблон имени проверяет бэкенд, см.
 * ARTICLE_IMAGE_URL_RE в app/models_article.py и PROGRAM_IMAGE_URL_RE в
 * app/models_program.py). Чужие картинки не показываем: это и пиксели
 * слежения за читателями, и файлы, которые однажды пропадут.
 */
const ARTICLE_IMAGE_PATH =
    /^\/uploads\/(?:articles|program-descriptions)\/[0-9a-f]{32}\.(?:jpg|png|webp)$/;

/**
 * Если внутри <pre> лежит блок "carousel" (см. utils/articleCarousel.ts),
 * возвращает его текст, иначе null — это обычный блок кода.
 */
function carouselSourceOf(children: ReactNode): string | null {
    const [child] = Children.toArray(children);

    if (!isValidElement(child)) {
        return null;
    }

    const { className, children: text } = (
        child as ReactElement<{ className?: string; children?: ReactNode }>
    ).props;

    if (
        typeof text !== "string" ||
        !className?.split(" ").includes(`language-${CAROUSEL_LANGUAGE}`)
    ) {
        return null;
    }

    return text;
}

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

/** Адреса, которые считаем «своим сайтом» кроме текущего (на localhost при
 *  разработке в текстах остаются боевые адреса). */
const OWN_HOSTS = new Set(["street-workout.online", "www.street-workout.online"]);

/**
 * Если href — полный адрес страницы этого же сайта, возвращает путь для
 * роутера (с параметрами и якорем), иначе null.
 */
function sameSitePath(href: string): string | null {
    let url: URL;

    try {
        url = new URL(href);
    } catch {
        return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }

    if (url.hostname !== window.location.hostname && !OWN_HOSTS.has(url.hostname)) {
        return null;
    }

    // Файлы, загрузки и API — не страницы роутера: пусть открываются как
    // обычная ссылка.
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
        return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
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

        // То же, если автор вставил полный адрес своего сайта
        // (https://street-workout.online/programs/18). Раньше такая ссылка
        // считалась внешней и открывалась в новой вкладке: в мобильных
        // встроенных браузерах (Telegram, VK) и в установленном на экран
        // сайте новая вкладка может оказаться другим браузером с другим
        // хранилищем, где нет токена входа, и человека «выбрасывало» из
        // аккаунта.
        const internalPath = href ? sameSitePath(href) : null;

        if (internalPath) {
            return <Link to={internalPath}>{children}</Link>;
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

    // Блок ```carousel с картинками внутри — карусель; любой другой
    // блок кода остаётся обычным.
    pre: (props) => {
        const { children, ...rest } = omitNode(props);
        const carouselSource = carouselSourceOf(children);

        if (carouselSource === null) {
            return <pre {...rest}>{children}</pre>;
        }

        // Как и у одиночной картинки: показываем только загруженные
        // через редактор, остальные пропускаем.
        const images = parseCarouselSource(carouselSource).flatMap((image) => {
            const url = ARTICLE_IMAGE_PATH.test(image.src)
                ? resolveMediaUrl(image.src)
                : undefined;

            return url ? [{ src: url, alt: image.alt }] : [];
        });

        if (images.length === 0) {
            return (
                <span className="markdown__image-blocked">
                    [картинки недоступны]
                </span>
            );
        }

        return <ArticleCarousel images={images} />;
    },

    // Широкая таблица прокручивается внутри своей рамки, а не растягивает страницу.
    table: (props) => (
        <div className="markdown__table-wrap">
            <table {...omitNode(props)} />
        </div>
    ),
};

type MarkdownContentProps = {
    /** Текст в Markdown (статья, описание программы). */
    source: string;

    /**
     * Одиночный перенос строки внутри абзаца показывается переносом (а не
     * пробелом, как в обычном Markdown). Нужно описаниям программ: их
     * писали простым текстом, где перенос строки значил именно перенос.
     */
    preserveLineBreaks?: boolean;
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
export default function MarkdownContent({
    source,
    preserveLineBreaks = false,
}: MarkdownContentProps) {
    return (
        <div
            className={
                preserveLineBreaks ? "markdown markdown--keep-breaks" : "markdown"
            }
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {source}
            </ReactMarkdown>
        </div>
    );
}
