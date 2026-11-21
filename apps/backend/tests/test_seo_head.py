"""
Мета-теги и текст страниц для роботов: /seo/head и /seo/body.

Caddy подставляет их ответы в index.html (см. apps/frontend/Caddyfile),
поэтому здесь проверяется то, что увидит робот без JavaScript.
"""

import pytest

from app import config
from test_public_access import COMPLEX_ID, content_fixture  # noqa: F401  (фикстура "content")

SITE = "https://example.test"


@pytest.fixture(autouse=True)
def fixed_site_url(monkeypatch):
    monkeypatch.setattr(config, "SITE_URL", SITE)


def _head(client, path):
    response = client.get("/seo/head", params={"path": path})

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/html")

    return response.text


def test_static_section_has_own_title_and_canonical(client):
    html = _head(client, "/playgrounds")

    assert "<title>Площадки — Street-workout.online</title>" in html
    assert f'<link rel="canonical" href="{SITE}/playgrounds" />' in html
    assert 'property="og:title"' in html
    assert 'name="twitter:card"' in html


def test_exercise_page_has_title_and_structured_data(client, content):
    html = _head(client, f"/knowledge/exercises/{content['exercise_id']}")

    assert "Street-workout.online</title>" in html
    assert "<title>Street-workout.online</title>" not in html
    assert 'application/ld+json' in html
    assert '"@type": "ExercisePlan"' in html


def test_complex_page_has_own_title(client, content):
    html = _head(client, f"/complexes/{COMPLEX_ID}")

    assert "<title>Street-workout.online</title>" not in html
    assert f'href="{SITE}/complexes/{COMPLEX_ID}"' in html


def test_unknown_record_is_noindex(client):
    html = _head(client, "/knowledge/exercises/net-takogo")

    assert 'name="robots" content="noindex, follow"' in html


def test_form_addresses_are_not_treated_as_record_ids(client):
    html = _head(client, "/playgrounds/add")

    assert "noindex" not in html


def test_head_escapes_user_text(client):
    html = _head(client, "/knowledge/exercises/<script>")

    assert "<script>" not in html


def test_body_contains_heading_for_section_page(client):
    response = client.get("/seo/body", params={"path": "/events"})

    assert response.status_code == 200
    assert "<h1>События</h1>" in response.text


def test_body_is_empty_for_pages_without_content(client):
    response = client.get("/seo/body", params={"path": "/login"})

    assert response.status_code == 200
    assert response.text == ""
