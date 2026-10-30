"""
robots.txt и sitemap.xml.

В карту сайта попадает только то, что видит гость без входа; черновики и
закрытые разделы — нет. Контент берём из той же фикстуры, что в
test_public_access.py.
"""

import xml.etree.ElementTree as ET

import pytest

from app import config
from test_public_access import COMPLEX_ID, content_fixture  # noqa: F401  (фикстура "content")

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
SITE = "https://example.test"


@pytest.fixture(autouse=True)
def fixed_site_url(monkeypatch):
    monkeypatch.setattr(config, "SITE_URL", SITE)


def _sitemap(client):
    response = client.get("/sitemap.xml")

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/xml")

    root = ET.fromstring(response.text)  # заодно проверяет, что XML корректен

    return {
        url.find("sm:loc", SITEMAP_NS).text: url
        for url in root.findall("sm:url", SITEMAP_NS)
    }


def test_robots_txt_points_to_sitemap_and_closes_private_sections(client):
    response = client.get("/robots.txt")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")

    lines = response.text.splitlines()

    assert "User-agent: *" in lines
    assert "Allow: /" in lines
    assert f"Sitemap: {SITE}/sitemap.xml" in lines

    for path in ("/login", "/diary", "/profile", "/u/", "/admin"):
        assert f"Disallow: {path}" in lines

    # API закрывать нельзя: страницы рисуются из его данных.
    assert not any(line.startswith("Disallow: /api") for line in lines)


def test_robots_txt_falls_back_to_request_address(client, monkeypatch):
    monkeypatch.setattr(config, "SITE_URL", "")

    response = client.get(
        "/robots.txt",
        headers={"x-forwarded-proto": "https", "x-forwarded-host": "workout.test"},
    )

    assert "Sitemap: https://workout.test/sitemap.xml" in response.text.splitlines()


def test_sitemap_lists_static_public_sections(client):
    urls = _sitemap(client)

    for path in (
        "/complexes",
        "/knowledge/exercises",
        "/knowledge/articles",
        "/playgrounds",
        "/events",
        "/programs",
    ):
        assert f"{SITE}{path}" in urls

    # Главная гостю недоступна (отправляет на вход) — в карте её нет.
    assert f"{SITE}/" not in urls


def test_sitemap_lists_public_content_pages(client, content):  # noqa: F811
    urls = _sitemap(client)

    assert f"{SITE}/complexes/{COMPLEX_ID}" in urls
    assert f"{SITE}/knowledge/exercises/{content['exercise_id']}" in urls
    assert f"{SITE}/knowledge/articles/{content['article_id']}" in urls
    assert f"{SITE}/playgrounds/{content['playground_id']}" in urls
    assert f"{SITE}/events/{content['event_id']}" in urls
    assert f"{SITE}/programs/{content['program_id']}" in urls


def test_sitemap_skips_drafts_and_private_pages(client, content):  # noqa: F811
    urls = _sitemap(client)

    assert f"{SITE}/knowledge/articles/{content['draft_id']}" not in urls
    assert f"{SITE}/programs/{content['draft_program_id']}" not in urls

    # Ни профили, ни дневники, ни формы создания и правки.
    assert not any("/u/" in url or "/diary" in url for url in urls)
    assert not any(url.endswith(("/create", "/edit")) for url in urls)


def test_sitemap_has_lastmod_as_a_date(client, content):  # noqa: F811
    urls = _sitemap(client)

    lastmod = urls[f"{SITE}/complexes/{COMPLEX_ID}"].find("sm:lastmod", SITEMAP_NS)

    assert lastmod is not None
    assert len(lastmod.text) == 10 and lastmod.text[4] == "-" and lastmod.text[7] == "-"


def test_sitemap_escapes_special_characters_in_ids(client, session):
    from app.models_complex import ComplexDB

    row = session.get(ComplexDB, COMPLEX_ID)
    session.add(ComplexDB(**{**row.model_dump(), "id": "tom&jerry комплекс"}))
    session.commit()

    response = client.get("/sitemap.xml")

    assert response.status_code == 200
    # Идентификатор в адресе закодирован, XML остаётся корректным.
    assert f"{SITE}/complexes/tom%26jerry%20%D0%BA" in response.text
    ET.fromstring(response.text)


def test_seo_files_are_public_and_not_in_api_docs(client):
    assert client.get("/robots.txt").status_code == 200
    assert client.get("/sitemap.xml").status_code == 200
