"""
Лайки на комментариях (routers/comment_likes.py): под записями дневника,
мероприятиями, программами и комплексами. Ставить и снимать лайк могут
вошедшие пользователи, посмотреть числа — все; свой комментарий лайкнуть
нельзя; лайк идемпотентен.
"""

from datetime import date

from app.models_event import EventComment
from conftest import auth_headers, register_user


def _user_id(client, token) -> int:
    response = client.get("/users/me", headers=auth_headers(token))
    assert response.status_code == 200, response.text

    return response.json()["id"]


def _create_diary_comment(client, author_token, commenter_token) -> int:
    """Запись автора и комментарий к ней от commenter; id комментария."""
    entry = client.post(
        "/diary/entries",
        json={
            "date": date.today().isoformat(),
            "title": "Тренировка",
            "description": "",
            "tags": [],
        },
        headers=auth_headers(author_token),
    )
    assert entry.status_code == 200, entry.text

    comment = client.post(
        "/diary/comments",
        params={"record_id": entry.json()["id"], "record_type": "workout"},
        json={"text": "Классная тренировка!"},
        headers=auth_headers(commenter_token),
    )
    assert comment.status_code == 200, comment.text

    return comment.json()["id"]


def _like(client, token, kind, comment_id):
    return client.put(
        f"/comment-likes/{kind}/{comment_id}", headers=auth_headers(token)
    )


def _unlike(client, token, kind, comment_id):
    return client.delete(
        f"/comment-likes/{kind}/{comment_id}", headers=auth_headers(token)
    )


def _list(client, kind, token=None):
    headers = auth_headers(token) if token else {}

    return client.get(f"/comment-likes/{kind}", headers=headers)


def _setup(client):
    """Автор записи, комментатор и тот, кто лайкает."""
    author = register_user(client, nickname="likes_author")
    commenter = register_user(client, nickname="likes_commenter")
    fan = register_user(client, nickname="likes_fan")
    comment_id = _create_diary_comment(
        client, author["token"], commenter["token"]
    )

    return author, commenter, fan, comment_id


def test_no_likes_at_first_and_list_is_public(client):
    response = _list(client, "diary")

    assert response.status_code == 200
    assert response.json() == []


def test_like_counts_and_who_liked(client):
    author, commenter, fan, comment_id = _setup(client)

    response = _like(client, fan["token"], "diary", comment_id)

    assert response.status_code == 200
    assert response.json() == {
        "comment_id": comment_id,
        "count": 1,
        "liked_by_me": True,
    }

    # Сам лайкнувший видит, что лайкнул; остальные и гости — только число.
    mine = _list(client, "diary", fan["token"]).json()
    assert mine == [{"comment_id": comment_id, "count": 1, "liked_by_me": True}]

    other = _list(client, "diary", author["token"]).json()
    assert other == [
        {"comment_id": comment_id, "count": 1, "liked_by_me": False}
    ]

    guest = _list(client, "diary").json()
    assert guest == [
        {"comment_id": comment_id, "count": 1, "liked_by_me": False}
    ]


def test_several_people_can_like_the_same_comment(client):
    author, commenter, fan, comment_id = _setup(client)

    _like(client, fan["token"], "diary", comment_id)
    response = _like(client, author["token"], "diary", comment_id)

    assert response.json()["count"] == 2


def test_liking_twice_counts_once(client):
    _, _, fan, comment_id = _setup(client)

    _like(client, fan["token"], "diary", comment_id)
    response = _like(client, fan["token"], "diary", comment_id)

    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_unlike_removes_the_like_and_is_idempotent(client):
    _, _, fan, comment_id = _setup(client)
    _like(client, fan["token"], "diary", comment_id)

    removed = _unlike(client, fan["token"], "diary", comment_id)

    assert removed.status_code == 200
    assert removed.json() == {
        "comment_id": comment_id,
        "count": 0,
        "liked_by_me": False,
    }
    assert _list(client, "diary").json() == []

    again = _unlike(client, fan["token"], "diary", comment_id)

    assert again.status_code == 200
    assert again.json()["count"] == 0


def test_unlike_does_not_touch_other_peoples_likes(client):
    author, _, fan, comment_id = _setup(client)
    _like(client, fan["token"], "diary", comment_id)
    _like(client, author["token"], "diary", comment_id)

    response = _unlike(client, fan["token"], "diary", comment_id)

    assert response.json() == {
        "comment_id": comment_id,
        "count": 1,
        "liked_by_me": False,
    }


def test_own_comment_cannot_be_liked(client):
    _, commenter, _, comment_id = _setup(client)

    response = _like(client, commenter["token"], "diary", comment_id)

    assert response.status_code == 400
    assert _list(client, "diary").json() == []


def test_guest_cannot_like(client):
    _, _, _, comment_id = _setup(client)

    response = client.put(f"/comment-likes/diary/{comment_id}")

    assert response.status_code == 401


def test_unknown_comment_is_404(client):
    fan = register_user(client, nickname="likes_lonely_fan")

    response = _like(client, fan["token"], "diary", 424242)

    assert response.status_code == 404


def test_unknown_kind_is_rejected(client):
    fan = register_user(client, nickname="likes_wrong_kind")

    response = _like(client, fan["token"], "blog", 1)

    assert response.status_code == 422


def test_kinds_do_not_mix(client, session):
    author, commenter, fan, comment_id = _setup(client)
    commenter_id = _user_id(client, commenter["token"])

    # Комментарий к мероприятию с тем же числовым id, что у комментария
    # к записи, — лайки у них отдельные.
    session.add(
        EventComment(
            id=comment_id,
            event_id=1,
            user_id=commenter_id,
            text="Приду!",
        )
    )
    session.commit()

    _like(client, fan["token"], "diary", comment_id)

    assert _list(client, "event").json() == []

    response = _like(client, fan["token"], "event", comment_id)

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert _list(client, "diary").json()[0]["count"] == 1


def test_likes_of_a_deleted_comment_disappear(client):
    author, commenter, fan, comment_id = _setup(client)
    _like(client, fan["token"], "diary", comment_id)

    deleted = client.delete(
        f"/diary/comments/{comment_id}",
        headers=auth_headers(commenter["token"]),
    )
    assert deleted.status_code == 204

    assert _list(client, "diary", fan["token"]).json() == []


def test_new_comment_does_not_inherit_likes_of_a_deleted_one(client):
    author, commenter, fan, comment_id = _setup(client)
    _like(client, fan["token"], "diary", comment_id)
    client.delete(
        f"/diary/comments/{comment_id}",
        headers=auth_headers(commenter["token"]),
    )

    # Следующий комментарий (в SQLite ему может достаться тот же id) —
    # без чужих лайков.
    entry = client.post(
        "/diary/entries",
        json={
            "date": date.today().isoformat(),
            "title": "Ещё",
            "description": "",
            "tags": [],
        },
        headers=auth_headers(author["token"]),
    )
    new_comment = client.post(
        "/diary/comments",
        params={"record_id": entry.json()["id"], "record_type": "workout"},
        json={"text": "Новый комментарий"},
        headers=auth_headers(commenter["token"]),
    )
    assert new_comment.status_code == 200

    assert _list(client, "diary", fan["token"]).json() == []

    # И лайкнуть его тот же человек может заново.
    response = _like(client, fan["token"], "diary", new_comment.json()["id"])

    assert response.json()["count"] == 1


def test_like_rate_limit_is_per_user(client):
    _, _, fan, comment_id = _setup(client)

    for _ in range(60):
        assert _unlike(client, fan["token"], "diary", comment_id).status_code == 200

    assert _unlike(client, fan["token"], "diary", comment_id).status_code == 429

    # У другого пользователя счётчик свой.
    other = register_user(client, nickname="likes_other_fan")

    assert _like(client, other["token"], "diary", comment_id).status_code == 200
