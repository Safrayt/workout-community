"""
Тесты на комментарии к комплексам (app/routers/complexes.py, секция
"Комментарии к комплексу"). Комплекс — не таблица в БД (статичный
каталог в models_complex.py), поэтому отдельно проверяем, что это
не мешает нормальной работе с комментариями и что несуществующий
complex_id корректно даёт 404, а не 500 из-за отсутствующего
внешнего ключа.
"""

from conftest import auth_headers, register_user

COMPLEX_ID = "hannibal-scheme-steel"


def _post_comment(client, token, text="Отличная схема, спасибо!"):
    return client.post(
        f"/complexes/{COMPLEX_ID}/comments",
        json={"text": text},
        headers=auth_headers(token),
    )


def _make_admin(session, nickname: str) -> None:
    from sqlmodel import select

    from app.models import User

    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def test_listing_comments_for_unknown_complex_is_404(client):
    response = client.get("/complexes/does-not-exist/comments")

    assert response.status_code == 404


def test_commenting_requires_auth(client):
    response = client.post(
        f"/complexes/{COMPLEX_ID}/comments", json={"text": "Привет"}
    )

    assert response.status_code == 401


def test_commenting_on_unknown_complex_is_404(client):
    author = register_user(client, nickname="author")

    response = client.post(
        "/complexes/does-not-exist/comments",
        json={"text": "Привет"},
        headers=auth_headers(author["token"]),
    )

    assert response.status_code == 404


def test_empty_comment_is_rejected(client):
    author = register_user(client, nickname="author")

    response = _post_comment(client, author["token"], text="   ")

    assert response.status_code == 400


def test_comment_over_max_length_is_rejected(client):
    author = register_user(client, nickname="author")

    response = _post_comment(client, author["token"], text="ы" * 501)

    assert response.status_code == 400


def test_create_and_list_comment(client):
    author = register_user(client, nickname="author")

    create_response = _post_comment(client, author["token"])
    assert create_response.status_code == 200

    list_response = client.get(f"/complexes/{COMPLEX_ID}/comments")
    assert list_response.status_code == 200

    comments = list_response.json()
    assert len(comments) == 1
    assert comments[0]["text"] == "Отличная схема, спасибо!"
    assert comments[0]["complex_id"] == COMPLEX_ID


def test_author_can_edit_own_comment(client):
    author = register_user(client, nickname="author")
    created = _post_comment(client, author["token"]).json()

    response = client.put(
        f"/complexes/comments/{created['id']}",
        json={"text": "Обновлённый текст"},
        headers=auth_headers(author["token"]),
    )

    assert response.status_code == 200
    assert response.json()["text"] == "Обновлённый текст"


def test_other_user_cannot_edit_comment(client):
    author = register_user(client, nickname="author")
    other = register_user(client, nickname="intruder")
    created = _post_comment(client, author["token"]).json()

    response = client.put(
        f"/complexes/comments/{created['id']}",
        json={"text": "Подделка"},
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403


def test_admin_cannot_edit_someone_elses_comment(client, session):
    """
    В отличие от площадок — здесь даже админу нельзя редактировать
    чужой текст (см. комментарий в update_complex_comment): иначе
    можно было бы вложить чужому человеку в уста что угодно.
    """
    author = register_user(client, nickname="author")
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")
    created = _post_comment(client, author["token"]).json()

    response = client.put(
        f"/complexes/comments/{created['id']}",
        json={"text": "Подмена от имени модератора"},
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 403


def test_other_user_cannot_delete_comment(client):
    author = register_user(client, nickname="author")
    other = register_user(client, nickname="intruder")
    created = _post_comment(client, author["token"]).json()

    response = client.delete(
        f"/complexes/comments/{created['id']}",
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403


def test_admin_can_delete_someone_elses_comment(client, session):
    author = register_user(client, nickname="author")
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")
    created = _post_comment(client, author["token"]).json()

    response = client.delete(
        f"/complexes/comments/{created['id']}",
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 204

    list_response = client.get(f"/complexes/{COMPLEX_ID}/comments")
    assert list_response.json() == []
