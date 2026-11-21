"""
SEO-разметка страниц для поисковых роботов.

Фронтенд — одностраничное приложение: все адреса отдают один и тот же
index.html, а заголовок страницы, описание и текст появляются только
после выполнения JavaScript. Яндекс и особенно ссылки-превью в
мессенджерах и соцсетях (Telegram, VK, WhatsApp) JavaScript не
выполняют, поэтому видят один общий заголовок и пустую страницу.

Этот модуль собирает то, что нужно подставить в index.html для
конкретного адреса:

- render_head — <title>, description, canonical, Open Graph, Twitter
  Card и микроразметку schema.org (JSON-LD);
- render_body — короткий текст страницы (заголовок и описание) внутри
  <div id="root">. React при запуске заменяет это содержимое своим
  (createRoot, а не hydrateRoot), так что пользователь его не видит и
  конфликтов гидрации нет.

Модуль не знает про базу данных: роутер app/routers/seo.py достаёт
строки из БД и передаёт сюда уже готовые PageSeo. Так сборку HTML
можно проверить обычными тестами без БД.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from html import escape
from typing import Any, Optional

SITE_NAME = "Street-workout.online"

SITE_DESCRIPTION = (
    "Сообщество уличной тренировки: площадки для воркаута, комплексы "
    "упражнений, программы тренировок, события и дневник тренировок."
)

# Сколько символов описания обычно показывает поисковая выдача — то же
# значение, что MAX_DESCRIPTION_LENGTH в frontend/src/utils/pageMeta.ts.
MAX_DESCRIPTION_LENGTH = 160

# Сколько символов текста страницы отдаём роботу в <div id="root">.
MAX_BODY_TEXT_LENGTH = 1500


@dataclass
class PageSeo:
    title: str
    description: str = SITE_DESCRIPTION

    # Абсолютный адрес картинки для превью ссылки; без неё в соцсетях
    # показывается ссылка без картинки.
    image: Optional[str] = None

    # Тип страницы для Open Graph: website, article.
    og_type: str = "website"

    # Структурированные данные schema.org (один объект или список).
    json_ld: Any = None

    # Страница не должна попадать в поиск (нет такой записи, закрытый
    # раздел): ставим noindex, чтобы «мягкие 404» не засоряли выдачу.
    noindex: bool = False

    # Заголовок и текст для <div id="root">. Пустой h1 — страница без
    # содержимого для робота.
    heading: str = ""
    text: str = ""

    extra: dict[str, Any] = field(default_factory=dict)


# Статические страницы разделов: заголовки совпадают с handle.title в
# frontend/src/app/router.tsx, описания — с handle.description там же,
# где оно есть, и дополнены там, где его нет.
STATIC_PAGES: dict[str, tuple[str, str]] = {
    "/complexes": (
        "Комплексы",
        "Комплексы упражнений для уличной тренировки: схемы, правила "
        "прохождения, таблицы результатов и рейтинг участников.",
    ),
    "/knowledge/exercises": (
        "Упражнения",
        "Справочник упражнений для воркаута и калистеники: техника "
        "выполнения, целевые мышцы, необходимое оборудование и "
        "прогрессии.",
    ),
    "/knowledge/articles": (
        "Статьи",
        "Статьи об уличной тренировке: техника, методика, питание и "
        "восстановление.",
    ),
    "/playgrounds": (
        "Площадки",
        "Каталог площадок для воркаута на карте: оборудование, "
        "покрытие, режим работы, фото и отзывы.",
    ),
    "/events": (
        "События",
        "Тренировки и события сообщества уличной тренировки: даты, "
        "места проведения и участники.",
    ),
    "/programs": (
        "Программы",
        "Программы тренировок для воркаута и калистеники: структура, "
        "версии и обсуждение.",
    ),
    "/privacy": ("Политика конфиденциальности", SITE_DESCRIPTION),
    "/terms": ("Пользовательское соглашение", SITE_DESCRIPTION),
}


def format_title(title: Optional[str]) -> str:
    """«Название — Street-workout.online»; без названия — только сайт."""

    clean = (title or "").strip()

    return f"{clean} — {SITE_NAME}" if clean else SITE_NAME


def make_description(*parts: Optional[str], limit: int = MAX_DESCRIPTION_LENGTH) -> str:
    """
    Описание из текста страницы: убирает разметку и переносы строк,
    склеивает части и обрезает по границе слова. Повторяет
    makeDescription из frontend/src/utils/pageMeta.ts, чтобы заголовок
    для робота и для браузера не расходились.
    """

    text = " ".join(part for part in parts if part)
    text = re.sub(r"<[^>]*>", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)  # картинки Markdown
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # ссылки Markdown
    text = re.sub(r"[*_#>`~]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= limit:
        return text

    cut = text[: limit - 1]
    last_space = cut.rfind(" ")
    cut = cut[:last_space] if last_space > 80 else cut

    return re.sub(r"[\s,.;:—-]+$", "", cut) + "…"


def absolute_url(base_url: str, url: Optional[str]) -> Optional[str]:
    """
    Абсолютный адрес картинки. Загрузки пользователей лежат на бэкенде
    как /uploads/..., а снаружи доступны по /api/uploads/... (см.
    Caddyfile); всё остальное — файлы фронтенда или внешние адреса.
    """

    if not url:
        return None

    if url.startswith(("http://", "https://")):
        return url

    if url.startswith("/uploads/"):
        return f"{base_url}/api{url}"

    return f"{base_url}{url}" if url.startswith("/") else None


def static_page(path: str) -> Optional[PageSeo]:
    entry = STATIC_PAGES.get(path.rstrip("/") or "/")

    if entry is None:
        return None

    title, description = entry

    return PageSeo(
        title=format_title(title),
        description=description,
        heading=title,
        text=description,
    )


def default_page() -> PageSeo:
    """Страница без своих данных (главная, вход, неизвестный адрес)."""

    return PageSeo(title=SITE_NAME)


def not_found_page() -> PageSeo:
    """Адрес публичного раздела, но записи с таким id нет."""

    return PageSeo(title=format_title("Страница не найдена"), noindex=True)


def _json_ld_script(data: Any) -> str:
    # "</" внутри <script> закрыл бы тег раньше времени — экранируем.
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

    return f'<script type="application/ld+json">{payload}</script>'


def _meta(attr: str, name: str, content: str) -> str:
    return f'<meta {attr}="{escape(name, quote=True)}" content="{escape(content, quote=True)}" />'


def render_head(page: PageSeo, base_url: str, path: str) -> str:
    """HTML для <head>: всё, что роботы читают без JavaScript."""

    canonical = f"{base_url}{path}" if path != "/" else base_url + "/"
    description = page.description or SITE_DESCRIPTION

    lines = [
        f"<title>{escape(page.title)}</title>",
        _meta("name", "description", description),
        f'<link rel="canonical" href="{escape(canonical, quote=True)}" />',
        _meta("property", "og:site_name", SITE_NAME),
        _meta("property", "og:locale", "ru_RU"),
        _meta("property", "og:type", page.og_type),
        _meta("property", "og:title", page.title),
        _meta("property", "og:description", description),
        _meta("property", "og:url", canonical),
        _meta(
            "name",
            "twitter:card",
            "summary_large_image" if page.image else "summary",
        ),
        _meta("name", "twitter:title", page.title),
        _meta("name", "twitter:description", description),
    ]

    if page.image:
        lines.append(_meta("property", "og:image", page.image))
        lines.append(_meta("name", "twitter:image", page.image))

    if page.noindex:
        lines.append(_meta("name", "robots", "noindex, follow"))

    if page.json_ld:
        lines.append(_json_ld_script(page.json_ld))

    return "\n    ".join(lines)


def render_body(page: PageSeo) -> str:
    """Текст страницы для <div id="root"> — для роботов без JavaScript."""

    if not page.heading:
        return ""

    text = page.text.strip()

    if len(text) > MAX_BODY_TEXT_LENGTH:
        text = text[: MAX_BODY_TEXT_LENGTH - 1].rstrip() + "…"

    paragraphs = "".join(
        f"<p>{escape(chunk.strip())}</p>"
        for chunk in re.split(r"\n{2,}", text)
        if chunk.strip()
    )

    return f"<main><h1>{escape(page.heading)}</h1>{paragraphs}</main>"


# ---------------------------------------------------------------------------
# schema.org
# ---------------------------------------------------------------------------


def exercise_json_ld(
    base_url: str,
    path: str,
    *,
    name: str,
    description: str,
    image: Optional[str],
    other_names: list[str],
    target_muscles: list[str],
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "ExercisePlan",
        "name": name,
        "url": f"{base_url}{path}",
        "description": description,
        "exerciseType": "Калистеника",
    }

    if other_names:
        data["alternateName"] = other_names

    if target_muscles:
        data["workload"] = {
            "@type": "QuantitativeValue",
            "description": ", ".join(target_muscles),
        }

    if image:
        data["image"] = image

    return data


def playground_json_ld(
    base_url: str,
    path: str,
    *,
    name: str,
    description: str,
    address: str,
    locality: str,
    latitude: float,
    longitude: float,
    opening_hours: str,
    image: Optional[str],
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        "name": name,
        "url": f"{base_url}{path}",
        "description": description,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": address,
            "addressLocality": locality,
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": latitude,
            "longitude": longitude,
        },
    }

    if opening_hours:
        data["openingHours"] = opening_hours

    if image:
        data["image"] = image

    return data


def event_json_ld(
    base_url: str,
    path: str,
    *,
    name: str,
    description: str,
    start_date: str,
    location_name: str,
    city: str,
    image: Optional[str],
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": name,
        "url": f"{base_url}{path}",
        "description": description,
        "startDate": start_date,
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
            "@type": "Place",
            "name": location_name,
            "address": {"@type": "PostalAddress", "addressLocality": city},
        },
    }

    if image:
        data["image"] = image

    return data


def article_json_ld(
    base_url: str,
    path: str,
    *,
    headline: str,
    description: str,
    image: Optional[str],
    published: Optional[str],
    modified: Optional[str],
    author: Optional[str],
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": description,
        "mainEntityOfPage": f"{base_url}{path}",
        "publisher": {"@type": "Organization", "name": SITE_NAME},
    }

    if image:
        data["image"] = image

    if published:
        data["datePublished"] = published

    if modified:
        data["dateModified"] = modified

    if author:
        data["author"] = {"@type": "Person", "name": author}

    return data
