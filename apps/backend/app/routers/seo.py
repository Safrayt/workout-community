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
from app.models_playground import Playground
from app.models_program import ProgramDB

router = APIRouter(tags=["seo"])

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
