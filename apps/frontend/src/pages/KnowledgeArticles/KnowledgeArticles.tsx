import { useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Pagination from "../../components/ui/Pagination/Pagination";
import TagBadge from "../../components/ui/TagBadge/TagBadge";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch";
import ArticleCard from "../../components/ArticleCard/ArticleCard";

import "../../styles/components/article-list.css";

import { listArticles, listArticleTags } from "../../api/articles";
import { articleCategories } from "../../constants/articleCategories";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import {
    emptyArticleFilters,
    hasActiveArticleFilters,
    parseArticleFilters,
    writeArticleFilters,
    type ArticleFilterState,
} from "../../utils/articleFilters";
import { toggleItem } from "../../utils/exerciseFilters";
import { getTotalPages } from "../../utils/pagination";
import { pluralizeRu } from "../../utils/pluralize";

const PAGE_SIZE = 12;

type ListMode = "published" | "drafts";

const MODE_OPTIONS = [
    { value: "published", label: "Опубликованные" },
    { value: "drafts", label: "Черновики" },
] as const;

/**
 * /knowledge/articles — статьи: фильтры по направленности и хештегам и
 * список с постраничной навигацией.
 *
 * - Направленность одна (кнопки над списком), хештегов можно выбрать
 *   несколько — тогда показываются статьи, у которых есть все.
 * - Фильтры и страница хранятся в адресе (?category=…&tag=…&page=2) и
 *   переживают переход на статью и возврат назад.
 * - Администратору доступны кнопка "Написать статью" и список черновиков.
 */
export default function KnowledgeArticles() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser } = useCurrentUser();

    const topRef = useRef<HTMLDivElement>(null);

    const filters = useMemo(
        () => parseArticleFilters(searchParams),
        [searchParams]
    );

    // Черновики видит только администратор; сервер проверяет это сам, а
    // здесь не даём обычному читателю "включить" их через адрес.
    const showDrafts = currentUser.isAdmin && filters.drafts;

    const list = useAsyncResource(
        JSON.stringify([
            "list",
            filters.category,
            filters.tags,
            filters.page,
            showDrafts,
        ]),
        () =>
            listArticles({
                category: filters.category,
                tags: filters.tags,
                page: filters.page,
                pageSize: PAGE_SIZE,
                drafts: showDrafts,
            })
    );

    const tagCloud = useAsyncResource(`cloud:${filters.category ?? ""}`, () =>
        listArticleTags(filters.category)
    );

    // Пока грузится другая страница или другие фильтры, остаётся
    // прежний список (чуть притушенный), а не пустой экран.
    const page = list.data ?? list.previousData;
    const isRefreshing = list.isLoading && page !== null;

    const listSearch = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";

    function updateFilters(
        next: ArticleFilterState,
        options: { replace?: boolean; scrollToTop?: boolean } = {}
    ) {
        // replace: каждое нажатие на фильтр не должно засорять историю
        // браузера — "Назад" должен уводить со страницы, а не
        // перебирать выбранные теги. Переход по страницам, наоборот,
        // пишется в историю.
        setSearchParams(writeArticleFilters(searchParams, next), {
            replace: options.replace ?? true,
        });

        if (options.scrollToTop) {
            topRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }

    function handleSelectCategory(category: ArticleFilterState["category"]) {
        updateFilters({
            ...filters,
            category: category === filters.category ? null : category,
            page: 1,
        });
    }

    function handleToggleTag(tag: string) {
        updateFilters({
            ...filters,
            tags: toggleItem(filters.tags, tag),
            page: 1,
        });
    }

    function handleCardTagClick(tag: string) {
        updateFilters(
            {
                ...filters,
                tags: filters.tags.includes(tag)
                    ? filters.tags
                    : [...filters.tags, tag],
                page: 1,
            },
            { scrollToTop: true }
        );
    }

    function handleResetFilters() {
        updateFilters({ ...emptyArticleFilters, drafts: filters.drafts });
    }

    const cloud = tagCloud.data ?? tagCloud.previousData ?? [];
    const cloudCounts = new Map(cloud.map((item) => [item.tag, item.count]));

    // Выбранный тег показываем, даже если его нет среди частых (например,
    // пришли по ссылке), — иначе его нечем было бы снять.
    const visibleTags = [
        ...new Set([...filters.tags, ...cloud.map((item) => item.tag)]),
    ];

    const hasFilters = hasActiveArticleFilters(filters);

    function renderResults() {
        if (list.error) {
            return (
                <div className="articles-empty-state">
                    <p className="articles-empty-state__title">
                        {list.error.message}
                    </p>

                    <Button variant="outline" onClick={list.reload}>
                        Повторить
                    </Button>
                </div>
            );
        }

        if (!page) {
            return <p className="articles-status">Загрузка статей…</p>;
        }

        if (page.items.length === 0) {
            if (page.total > 0) {
                // Страница за пределами списка (устаревшая ссылка).
                return (
                    <div className="articles-empty-state">
                        <p className="articles-empty-state__title">
                            Такой страницы нет
                        </p>

                        <Button
                            variant="outline"
                            onClick={() =>
                                updateFilters({ ...filters, page: 1 })
                            }
                        >
                            К первой странице
                        </Button>
                    </div>
                );
            }

            if (hasFilters) {
                return (
                    <div className="articles-empty-state">
                        <p className="articles-empty-state__title">
                            Ничего не найдено
                        </p>

                        <p className="articles-empty-state__description">
                            Нет статей, которые подходят под все выбранные
                            параметры. Попробуйте убрать часть хештегов или
                            сменить направленность.
                        </p>

                        <Button variant="outline" onClick={handleResetFilters}>
                            Сбросить фильтры
                        </Button>
                    </div>
                );
            }

            return (
                <div className="articles-empty-state">
                    <p className="articles-empty-state__title">
                        {showDrafts ? "Черновиков нет" : "Статей пока нет"}
                    </p>

                    <p className="articles-empty-state__description">
                        {currentUser.isAdmin
                            ? showDrafts
                                ? "Сохранённые черновики появятся здесь."
                                : "Нажмите «Написать статью», чтобы добавить первую."
                            : "Загляните позже — скоро здесь появятся статьи."}
                    </p>
                </div>
            );
        }

        return (
            <>
                <p className="articles-count">
                    {`Найдено: ${page.total} ${pluralizeRu(page.total, [
                        "статья",
                        "статьи",
                        "статей",
                    ])}`}
                </p>

                <div
                    className={
                        "articles-list" +
                        (isRefreshing ? " articles-list--refreshing" : "")
                    }
                    aria-busy={isRefreshing}
                >
                    {page.items.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            listSearch={listSearch}
                            onTagClick={handleCardTagClick}
                        />
                    ))}
                </div>

                <Pagination
                    page={page.page}
                    totalPages={getTotalPages(page.total, PAGE_SIZE)}
                    onPageChange={(next) =>
                        updateFilters(
                            { ...filters, page: next },
                            { replace: false, scrollToTop: true }
                        )
                    }
                />
            </>
        );
    }

    return (
        <Section title="Статьи">
            {currentUser.isAdmin && (
                // Писать статьи может только администратор; сервер
                // проверяет это сам (ensure_admin), здесь кнопки просто
                // не показываем остальным.
                <div className="articles-toolbar">
                    <div className="articles-toolbar__mode">
                        <ViewSwitch<ListMode>
                            options={MODE_OPTIONS}
                            value={showDrafts ? "drafts" : "published"}
                            onChange={(mode) =>
                                updateFilters({
                                    ...filters,
                                    drafts: mode === "drafts",
                                    page: 1,
                                })
                            }
                            ariaLabel="Какие статьи показывать"
                        />
                    </div>

                    <Link to="/knowledge/articles/create">
                        <Button type="button" variant="primary">
                            Написать статью
                        </Button>
                    </Link>
                </div>
            )}

            <div ref={topRef} className="articles-filters">
                <div
                    className="articles-filters__categories"
                    role="group"
                    aria-label="Направленность"
                >
                    <button
                        type="button"
                        className={
                            "articles-chip" +
                            (filters.category === null
                                ? " articles-chip--active"
                                : "")
                        }
                        aria-pressed={filters.category === null}
                        onClick={() => handleSelectCategory(null)}
                    >
                        Все
                    </button>

                    {articleCategories.map((category) => (
                        <button
                            key={category.key}
                            type="button"
                            className={
                                "articles-chip" +
                                (filters.category === category.key
                                    ? " articles-chip--active"
                                    : "")
                            }
                            style={
                                {
                                    "--chip-color": category.color,
                                } as React.CSSProperties
                            }
                            aria-pressed={filters.category === category.key}
                            onClick={() => handleSelectCategory(category.key)}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>

                {!showDrafts && visibleTags.length > 0 && (
                    <div className="articles-filters__tags">
                        <span className="articles-filters__label">
                            Хештеги:
                        </span>

                        <div className="tag-list">
                            {visibleTags.map((tag) => {
                                const count = cloudCounts.get(tag);

                                return (
                                    <TagBadge
                                        key={tag}
                                        label={
                                            count === undefined
                                                ? `#${tag}`
                                                : `#${tag} · ${count}`
                                        }
                                        active={filters.tags.includes(tag)}
                                        onClick={() => handleToggleTag(tag)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {hasFilters && (
                    <div>
                        <Button variant="outline" onClick={handleResetFilters}>
                            Сбросить фильтры
                        </Button>
                    </div>
                )}
            </div>

            {renderResults()}
        </Section>
    );
}
