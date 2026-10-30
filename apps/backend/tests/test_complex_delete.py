"""
DELETE /complexes/{id} — удаление комплекса администратором.

Вместе с комплексом удаляются выполнения, комментарии и уведомления об
упоминаниях на его странице. Записи дневника остаются (п.26 документа).
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_complex import ComplexComment, ComplexCompletion, ComplexDB
from app.models_diary import WorkoutEntry
from app.models_notification import Notification
from conftest import auth_headers, register_user

COMPLEX_ID = "hannibal-scheme-steel"
OTHER_COMPLEX_ID = "other-complex"


def _make_admin(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def _user_id(session, nickname: str) -> int:
    return session.exec(select(User).where(User.nickname == nickname)).first().id


def _admin_headers(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")
    return auth_headers(admin["token"])


def _copy_complex(session, new_id: str) -> None:
    """Второй комплекс — чтобы проверить, что удаление не задевает чужие данные."""
    row = session.get(ComplexDB, COMPLEX_ID)
    session.add(ComplexDB(**{**row.model_dump(), "id": new_id}))
    session.commit()


def _add_completion(session, user_id: int, complex_id: str) -> int:
    entry = WorkoutEntry(
        date=date.today(), title="Тренировка для теста", user_id=user_id
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    completion = ComplexCompletion(
        complex_id=complex_id,
        user_id=user_id,
        completed_date=date.today(),
        diary_entry_id=entry.id,
        result_time_seconds=100,
    )
    session.add(completion)
    session.commit()

    return entry.id


def test_deleting_complex_requires_auth(client):
    assert client.delete(f"/complexes/{COMPLEX_ID}").status_code == 401


def test_regular_user_cannot_delete_complex(client):
    user = register_user(client, nickname="athlete")

    response = client.delete(
        f"/complexes/{COMPLEX_ID}", headers=auth_headers(user["token"])
    )

    assert response.status_code == 403
    assert client.get(f"/complexes/{COMPLEX_ID}").status_code == 200


def test_deleting_unknown_complex_is_404(client, session):
    admin = _admin_headers(client, session)

    assert client.delete("/complexes/no-such-complex", headers=admin).status_code == 404


def test_admin_can_delete_complex(client, session):
    admin = _admin_headers(client, session)

    response = client.delete(f"/complexes/{COMPLEX_ID}", headers=admin)

    assert response.status_code == 204
    assert client.get(f"/complexes/{COMPLEX_ID}").status_code == 404
    assert COMPLEX_ID not in [c["id"] for c in client.get("/complexes/").json()]


def test_deleting_complex_removes_its_completions_comments_and_mentions(
    client, session
):
    admin = _admin_headers(client, session)
    athlete = register_user(client, nickname="athlete")
    athlete_id = _user_id(session, "athlete")
    _copy_complex(session, OTHER_COMPLEX_ID)

    entry_id = _add_completion(session, athlete_id, COMPLEX_ID)
    _add_completion(session, athlete_id, OTHER_COMPLEX_ID)

    for complex_id in (COMPLEX_ID, OTHER_COMPLEX_ID):
        session.add(ComplexComment(complex_id=complex_id, user_id=athlete_id, text="Круто"))
        session.add(
            Notification(
                type="mention",
                target_url=f"/complexes/{complex_id}",
                user_id=athlete_id,
                actor_id=athlete_id,
            )
        )
    session.commit()

    assert client.delete(f"/complexes/{COMPLEX_ID}", headers=admin).status_code == 204

    session.expire_all()

    # Всё, что относилось к удалённому комплексу, исчезло…
    assert not session.exec(
        select(ComplexCompletion).where(ComplexCompletion.complex_id == COMPLEX_ID)
    ).all()
    assert not session.exec(
        select(ComplexComment).where(ComplexComment.complex_id == COMPLEX_ID)
    ).all()
    assert not session.exec(
        select(Notification).where(Notification.target_url == f"/complexes/{COMPLEX_ID}")
    ).all()

    # …а запись дневника осталась…
    assert session.get(WorkoutEntry, entry_id) is not None

    # …и данные другого комплекса не тронуты.
    assert session.get(ComplexDB, OTHER_COMPLEX_ID) is not None
    assert len(
        session.exec(
            select(ComplexCompletion).where(ComplexCompletion.complex_id == OTHER_COMPLEX_ID)
        ).all()
    ) == 1
    assert len(
        session.exec(
            select(ComplexComment).where(ComplexComment.complex_id == OTHER_COMPLEX_ID)
        ).all()
    ) == 1
    assert len(
        session.exec(
            select(Notification).where(
                Notification.target_url == f"/complexes/{OTHER_COMPLEX_ID}"
            )
        ).all()
    ) == 1
