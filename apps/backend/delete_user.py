"""
Удаление пользователя вместе со всеми его личными данными.

Использование:
    docker compose exec backend python3 delete_user.py НИКНЕЙМ

Если у пользователя есть СВОИ площадки или мероприятия (он их
создал) — скрипт по умолчанию откажется удалять и покажет список:
это общий контент сообщества, а не личные данные, поэтому решение,
что с ним делать, должно быть осознанным. Варианты:

    1) Разобраться с этим контентом вручную (перепривязать на другого
       автора через UPDATE creator_id в базе, или удалить отдельно
       через сам сайт под правами администратора) и повторить запуск.
    2) Запустить с флагом --with-owned-content — тогда все созданные
       пользователем площадки и мероприятия будут удалены вместе с
       ним. Необратимо.

Личные данные — записи дневника, отзывы, избранное, подписки,
комментарии, теги, выполнения комплексов — удаляются в любом случае,
без флага: без владельца-пользователя они не имеют смысла.

Технически скрипт переиспользует те же функции, что вызывает сам
сайт (delete_playground, delete_event, delete_workout_entry,
delete_diary_note — обычные функции из routers/, вызываются здесь
напрямую в обход HTTP/FastAPI), чтобы не дублировать их логику
(удаление файлов фото с диска, очистка комментариев и т.п.) и не
разойтись с ней в будущем.
"""

import argparse
import sys

sys.path.insert(0, ".")

from fastapi import HTTPException  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models import User  # noqa: E402
from app.models_complex import ComplexCompletion  # noqa: E402
from app.models_diary import Comment, DiaryNote, PersonalTag, WorkoutEntry  # noqa: E402
from app.models_event import Event, EventRegistration  # noqa: E402
from app.models_playground import Playground  # noqa: E402
from app.models_review import PlaygroundReview  # noqa: E402
from app.models_social import PlaygroundFavorite, Subscription  # noqa: E402
from app.routers.diary import delete_diary_note, delete_workout_entry  # noqa: E402
from app.routers.events import delete_event  # noqa: E402
from app.routers.playgrounds import delete_playground  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("nickname", help="nickname пользователя для удаления")
    parser.add_argument(
        "--with-owned-content",
        action="store_true",
        help=(
            "Удалить вместе с пользователем и все созданные им "
            "площадки/мероприятия (иначе при их наличии скрипт "
            "откажется удалять пользователя)"
        ),
    )
    args = parser.parse_args()

    with Session(engine) as session:
        target = session.exec(
            select(User).where(User.nickname == args.nickname)
        ).first()

        if target is None:
            print(f"Пользователь '{args.nickname}' не найден.")
            raise SystemExit(1)

        owned_playgrounds = session.exec(
            select(Playground).where(Playground.creator_id == target.id)
        ).all()
        owned_events = session.exec(
            select(Event).where(Event.creator_id == target.id)
        ).all()

        if (owned_playgrounds or owned_events) and not args.with_owned_content:
            print(
                f"У пользователя '{args.nickname}' есть созданный им "
                f"контент — это общий контент сообщества, а не личные "
                f"данные, поэтому удалять его без явного согласия "
                f"скрипт не будет:"
            )
            for playground in owned_playgrounds:
                print(f"  площадка #{playground.id}: {playground.name}")
            for event in owned_events:
                print(f"  мероприятие #{event.id}: {event.title}")
            print()
            print(
                "Разберитесь с этим контентом вручную (перепривязать "
                "на другого автора или удалить через сайт под "
                "администратором) и повторите, либо запустите с "
                "флагом --with-owned-content, чтобы удалить всё "
                "перечисленное вместе с пользователем (необратимо)."
            )
            raise SystemExit(1)

        print(f"Удаляю пользователя '{args.nickname}' (id={target.id})...")

        # 1. Мероприятия, созданные пользователем — раньше площадок,
        #    которые он создал: площадку нельзя удалить, пока на неё
        #    ссылается хоть одно мероприятие (см. delete_playground),
        #    а её собственные мероприятия как раз мешают этому.
        for event in owned_events:
            delete_event(event.id, current_user=target, session=session)
            print(f"  удалено мероприятие #{event.id}")

        # 2. Записи дневника и заметки — до выполнений комплексов:
        #    delete_workout_entry сам решает, что делать со связанными
        #    выполнениями (отвязывает, не удаляет — см. models_complex),
        #    поэтому после этого шага их можно спокойно удалить.
        entries = session.exec(
            select(WorkoutEntry).where(WorkoutEntry.user_id == target.id)
        ).all()
        for entry in entries:
            delete_workout_entry(entry.id, current_user=target, session=session)
        if entries:
            print(f"  удалено записей дневника: {len(entries)}")

        notes = session.exec(
            select(DiaryNote).where(DiaryNote.user_id == target.id)
        ).all()
        for note in notes:
            delete_diary_note(note.id, current_user=target, session=session)
        if notes:
            print(f"  удалено заметок дневника: {len(notes)}")

        # 3. Площадки, созданные пользователем. Может отказать (400),
        #    если на площадку всё ещё ссылается чьё-то ЧУЖОЕ
        #    мероприятие (свои мы уже удалили выше) — в этом случае
        #    прерываемся и ничего не коммитим дальше, чтобы не
        #    оставить пользователя в наполовину удалённом состоянии.
        for playground in owned_playgrounds:
            try:
                delete_playground(
                    playground.id, current_user=target, session=session
                )
            except HTTPException as error:
                session.rollback()
                print()
                print(
                    f"Не удалось удалить площадку #{playground.id} "
                    f"('{playground.name}'): {error.detail}"
                )
                print(
                    "Скорее всего на неё ссылается мероприятие, "
                    "созданное ДРУГИМ пользователем. Разберитесь с "
                    "ним вручную и запустите скрипт заново — уже "
                    "удалённые на этом прогоне мероприятия/записи "
                    "дневника пользователя удалять придётся заново, "
                    "они не сохранились из-за отката."
                )
                raise SystemExit(1)
            print(f"  удалена площадка #{playground.id}")

        # 4. Всё остальное — личные данные без сложных побочных
        #    эффектов (файлов на диске у них нет), поэтому просто
        #    удаляем строки напрямую.
        def _delete_all(model, column, count_label: str) -> None:
            rows = session.exec(select(model).where(column == target.id)).all()
            for row in rows:
                session.delete(row)
            if rows:
                print(f"  удалено ({count_label}): {len(rows)}")

        _delete_all(
            ComplexCompletion, ComplexCompletion.user_id, "выполнений комплексов"
        )
        _delete_all(
            EventRegistration,
            EventRegistration.user_id,
            "регистраций на мероприятия",
        )
        _delete_all(
            PlaygroundFavorite,
            PlaygroundFavorite.user_id,
            "площадок в избранном",
        )
        _delete_all(PlaygroundReview, PlaygroundReview.user_id, "отзывов")
        _delete_all(Comment, Comment.user_id, "комментариев")
        _delete_all(PersonalTag, PersonalTag.user_id, "личных тегов")

        following = session.exec(
            select(Subscription).where(Subscription.follower_id == target.id)
        ).all()
        followers = session.exec(
            select(Subscription).where(Subscription.following_id == target.id)
        ).all()
        for subscription in [*following, *followers]:
            session.delete(subscription)
        if following or followers:
            print(f"  удалено подписок (в обе стороны): {len(following) + len(followers)}")

        # 5. И сам пользователь.
        session.delete(target)
        session.commit()

        print()
        print(f"Готово. Пользователь '{args.nickname}' удалён.")


if __name__ == "__main__":
    main()
