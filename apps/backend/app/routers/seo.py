"""
robots.txt и sitemap.xml — для поисковых систем и роботов.

Фронтенд — одностраничное приложение: любой неизвестный адрес отдаёт
index.html, поэтому эти два файла нельзя положить в статику (robots.txt
превратился бы в HTML-страницу). Их отдаёт бэкенд, а Caddy направляет на
него запросы /robots.txt и /sitemap.xml (см. apps/frontend/Caddyfile).

В sitemap попадает только то, что может прочитать гость без входа:
разделы каталога и страницы упражнений, комплексов, площадок, событий,
опубликованных программ и статей. Профили, дневники, черновики и всё
остальное, что открывается только после входа, в карту не попадает.
Список собирается из базы при каждом запросе, поэтому всегда актуален.
"""

import logging
from datetime import date, datetime
from typing import Iterable, Optional
from urllib.parse import quote
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse, Response
from sqlmodel import Session, select

from app import config
from app.database import get_session
from app.models_article import ArticleDB
from app.models_complex import ComplexDB
from app.models_event import Event
from app.models_exercise import ExerciseDB
from app.models_playground import Playground, PlaygroundPhoto
from app.models_program import ProgramDB
from app import seo_meta

router = APIRouter(tags=["seo"])

logger = logging.getLogger(__name__)

# Страницы разделов, открытые гостям (маршруты с handle.guest в
# frontend/src/app/router.tsx). Главная "/" сюда не входит: гостя она
# отправляет на вход, а адрес с редиректом в карте сайта не нужен.
STATIC_PATHS = [
    "/complexes",
    "/knowledge/exercises",
    "/knowledge/articles",
    "/playgrounds",
    "/events",
    "/programs",
    "/privacy",
    "/terms",
]

# Протокол sitemap допускает не больше 50 000 адресов в одном файле.
# Когда сайт вырастет до такого объёма, карту нужно разбить на несколько
# файлов с общим индексом.
MAX_SITEMAP_URLS = 50_000

# Закрытые от индексации разделы: они требуют входа, и роботу там
# нечего читать. /api/ НЕ закрываем: страницы рисуются в браузере из
# данных API, и без доступа к нему поисковик увидит пустую страницу.
# Саму выдачу API от индексации защищает заголовок X-Robots-Tag в Caddy.
DISALLOWED_PATHS = [
    "/login",
    "/register",
    "/recover",
    "/profile",
    "/u/",
    "/diary",
    "/notifications",
    "/achievements",
    "/admin",
    "/playgrounds/add",
    "/*/create",
    "/*/edit",
]


def site_url(request: Request) -> str:
    """
    Основной адрес сайта. Берётся из SITE_URL; если не задан —
    восстанавливается по запросу (за Caddy схему и хост передают
    заголовки X-Forwarded-*).
    """

    if config.SITE_URL:
        return config.SITE_URL

    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )

    return f"{scheme}://{host}".rstrip("/")


def _path(*segments: object) -> str:
    """Путь страницы с экранированием: идентификаторы вставляются в адрес."""

    return "/" + "/".join(quote(str(segment), safe="") for segment in segments)


def _lastmod(value: Optional[datetime]) -> Optional[str]:
    return value.date().isoformat() if value else None


def _page_entries(session: Session) -> Iterable[tuple[str, Optional[str]]]:
    """(путь, дата последнего изменения) всех публичных страниц."""

    for path in STATIC_PATHS:
        yield path, None

    for row in session.exec(select(ExerciseDB.id, ExerciseDB.updated_at)):
        yield _path("knowledge", "exercises", row[0]), _lastmod(row[1])

    for row in session.exec(select(ComplexDB.id, ComplexDB.updated_at)):
        yield _path("complexes", row[0]), _lastmod(row[1])

    for row in session.exec(select(Playground.id, Playground.updated_at)):
        yield _path("playgrounds", row[0]), _lastmod(row[1])

    # У события нет даты изменения — только дата создания, она для
    # lastmod не годится (событие правят и после создания).
    for event_id in session.exec(select(Event.id)):
        yield _path("events", event_id), None

    for row in session.exec(
        select(ProgramDB.id, ProgramDB.updated_at).where(
            ProgramDB.is_published == True  # noqa: E712
        )
    ):
        yield _path("programs", row[0]), _lastmod(row[1])

    for row in session.exec(
        select(ArticleDB.id, ArticleDB.updated_at).where(
            ArticleDB.is_published == True  # noqa: E712
        )
    ):
        yield _path("knowledge", "articles", row[0]), _lastmod(row[1])


def build_robots(base_url: str) -> str:
    lines = ["User-agent: *", "Allow: /"]

    lines += [f"Disallow: {path}" for path in DISALLOWED_PATHS]
    lines += ["", f"Sitemap: {base_url}/sitemap.xml", ""]

    return "\n".join(lines)


def build_sitemap(base_url: str, session: Session) -> str:
    entries = []

    for index, (path, lastmod) in enumerate(_page_entries(session)):
        if index >= MAX_SITEMAP_URLS:
            break

        entry = f"<loc>{escape(base_url + path)}</loc>"

        if lastmod:
            entry += f"<lastmod>{lastmod}</lastmod>"

        entries.append(f"  <url>{entry}</url>")

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )


@router.get("/robots.txt", include_in_schema=False)
def robots_txt(request: Request) -> PlainTextResponse:
    return PlainTextResponse(
        build_robots(site_url(request)),
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(
    request: Request, session: Session = Depends(get_session)
) -> Response:
    return Response(
        build_sitemap(site_url(request), session),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ---------------------------------------------------------------------------
# Мета-теги и текст страниц для роботов
#
# Caddy подставляет ответы этих двух адресов в index.html (директива
# templates и httpInclude, см. apps/frontend/Caddyfile): /seo/head — в
# <head>, /seo/body — в <div id="root">. Браузер после загрузки
# JavaScript заменяет всё это содержимым React, а роботы без JavaScript
# (Яндекс, превью ссылок в Telegram/VK/WhatsApp) видят уникальные
# заголовок, описание, Open Graph и текст страницы.
# ---------------------------------------------------------------------------

# Страницы с одним id в адресе: раздел -> загрузчик. "create" и "add" —
# служебные адреса форм, а не id записей.
_NON_ID_SEGMENTS = {"create", "add"}


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _single_id(path: str, prefix: str) -> Optional[str]:
    """id из адреса вида /<prefix>/<id>; для других адресов — None."""

    if not path.startswith(prefix + "/"):
        return None

    rest = path[len(prefix) + 1 :].strip("/")

    if not rest or "/" in rest:
        return None

    return rest


def _exercise_page(session: Session, base: str, path: str, item_id: str):
    row = session.get(ExerciseDB, item_id)

    if row is None:
        return seo_meta.not_found_page()

    image = seo_meta.absolute_url(base, row.photo_url)
    description = seo_meta.make_description(row.description) or (
        f"Упражнение «{row.name}»: техника выполнения и целевые мышцы."
    )
    technique = " ".join(
        f"{index}. {step}" for index, step in enumerate(row.technique or [], 1)
    )

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.name),
        description=description,
        image=image,
        json_ld=seo_meta.exercise_json_ld(
            base,
            path,
            name=row.name,
            description=description,
            image=image,
            other_names=list(row.other_names or []),
            target_muscles=[],
        ),
        heading=row.name,
        text="\n\n".join(
            part
            for part in (
                row.description,
                f"Техника выполнения: {technique}" if technique else "",
            )
            if part
        ),
    )


def _complex_page(session: Session, base: str, path: str, item_id: str):
    row = session.get(ComplexDB, item_id)

    if row is None:
        return seo_meta.not_found_page()

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.name),
        description=seo_meta.make_description(row.description)
        or f"Комплекс упражнений «{row.name}» для уличной тренировки.",
        heading=row.name,
        text="\n\n".join(
            part for part in (row.description, row.scheme_display) if part
        ),
    )


def _playground_page(session: Session, base: str, path: str, item_id: str):
    if not item_id.isdigit():
        return seo_meta.not_found_page()

    row = session.get(Playground, int(item_id))

    if row is None:
        return seo_meta.not_found_page()

    photo = session.exec(
        select(PlaygroundPhoto)
        .where(PlaygroundPhoto.playground_id == row.id)
        .order_by(PlaygroundPhoto.is_main.desc(), PlaygroundPhoto.id)
    ).first()
    image = seo_meta.absolute_url(base, photo.url if photo else None)

    # В базе у части площадок вместо пустого значения записано "Не указано"
    # — в разметку и текст для робота это попадать не должно.
    hours = (row.opening_hours or "").strip()

    if hours.lower() == "не указано":
        hours = ""

    lead = f"Площадка для воркаута{', ' + row.locality if row.locality else ''}."
    description = seo_meta.make_description(lead, row.description)

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.name),
        description=description,
        image=image,
        json_ld=seo_meta.playground_json_ld(
            base,
            path,
            name=row.name,
            description=description,
            address=row.address,
            locality=row.locality,
            latitude=row.latitude,
            longitude=row.longitude,
            opening_hours=hours,
            image=image,
        ),
        heading=row.name,
        text="\n\n".join(
            part
            for part in (
                f"Адрес: {row.address}" if row.address else "",
                f"Режим работы: {hours}" if hours else "",
                row.description,
            )
            if part
        ),
    )


def _event_page(session: Session, base: str, path: str, item_id: str):
    if not item_id.isdigit():
        return seo_meta.not_found_page()

    row = session.get(Event, int(item_id))

    if row is None:
        return seo_meta.not_found_page()

    image = seo_meta.absolute_url(base, row.poster_url)
    description = seo_meta.make_description(row.description) or (
        f"Событие «{row.title}» сообщества уличной тренировки."
    )

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.title),
        description=description,
        image=image,
        json_ld=seo_meta.event_json_ld(
            base,
            path,
            name=row.title,
            description=description,
            start_date=row.start_date.isoformat(),
            location_name=row.location,
            city=row.city,
            image=image,
        ),
        heading=row.title,
        text="\n\n".join(
            part
            for part in (
                f"Начало: {row.start_date.strftime('%d.%m.%Y %H:%M')}",
                f"Место: {row.city}, {row.location}",
                row.description,
            )
            if part
        ),
    )


def _program_page(session: Session, base: str, path: str, item_id: str):
    if not item_id.isdigit():
        return seo_meta.not_found_page()

    row = session.get(ProgramDB, int(item_id))

    if row is None or not row.is_published:
        return seo_meta.not_found_page()

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.title),
        description=seo_meta.make_description(row.description)
        or f"Программа тренировок «{row.title}».",
        image=seo_meta.absolute_url(base, row.cover_url),
        heading=row.title,
        text=seo_meta.make_description(
            row.description, limit=seo_meta.MAX_BODY_TEXT_LENGTH
        ),
    )


def _article_page(session: Session, base: str, path: str, item_id: str):
    row = session.get(ArticleDB, item_id)

    if row is None or not row.is_published:
        return seo_meta.not_found_page()

    image = seo_meta.absolute_url(base, row.cover_url)
    description = seo_meta.make_description(row.summary) or (
        seo_meta.make_description(row.body)
    )

    return seo_meta.PageSeo(
        title=seo_meta.format_title(row.title),
        description=description,
        image=image,
        og_type="article",
        json_ld=seo_meta.article_json_ld(
            base,
            path,
            headline=row.title,
            description=description,
            image=image,
            published=_iso(row.published_at),
            modified=_iso(row.updated_at),
            author=None,
        ),
        heading=row.title,
        text=seo_meta.make_description(
            row.summary, row.body, limit=seo_meta.MAX_BODY_TEXT_LENGTH
        ),
    )


_DETAIL_LOADERS = {
    "/knowledge/exercises": _exercise_page,
    "/knowledge/articles": _article_page,
    "/complexes": _complex_page,
    "/playgrounds": _playground_page,
    "/events": _event_page,
    "/programs": _program_page,
}


def load_page_seo(session: Session, base: str, path: str) -> seo_meta.PageSeo:
    """SEO-данные страницы по адресу; для неизвестных адресов — общие."""

    path = "/" + path.strip("/") if path.strip("/") else "/"

    static = seo_meta.static_page(path)

    if static is not None:
        return static

    for prefix, loader in _DETAIL_LOADERS.items():
        item_id = _single_id(path, prefix)

        if item_id is not None and item_id not in _NON_ID_SEGMENTS:
            return loader(session, base, path, item_id)

    return seo_meta.default_page()


def _safe_page(session: Session, base: str, path: str) -> seo_meta.PageSeo:
    # Эти адреса подставляются в КАЖДУЮ страницу сайта: ошибка здесь не
    # должна ломать загрузку сайта, поэтому при любой проблеме отдаём
    # общие данные.
    try:
        return load_page_seo(session, base, path)
    except Exception:  # noqa: BLE001
        logger.exception("Не удалось собрать SEO-данные для %s", path)

        return seo_meta.default_page()


@router.get("/seo/head", include_in_schema=False)
def seo_head(
    request: Request,
    path: str = "/",
    session: Session = Depends(get_session),
) -> Response:
    base = site_url(request)
    page = _safe_page(session, base, path)

    return Response(
        seo_meta.render_head(page, base, path),
        media_type="text/html; charset=utf-8",
    )


@router.get("/seo/body", include_in_schema=False)
def seo_body(
    request: Request,
    path: str = "/",
    session: Session = Depends(get_session),
) -> Response:
    page = _safe_page(session, site_url(request), path)

    return Response(
        seo_meta.render_body(page),
        media_type="text/html; charset=utf-8",
    )
