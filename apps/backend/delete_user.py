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

Сама логика удаления вынесена в app/user_deletion.py — её же
переиспользует DELETE /users/{user_id} в админ-панели на сайте, чтобы
не разойтись с этим скриптом в будущем.
"""

import argparse
import sys

sys.path.insert(0, ".")

from fastapi import HTTPException  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models import User  # noqa: E402
from app.user_deletion import (  # noqa: E402
    UserHasOwnedContentError,
    delete_user_completely,
)


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

        print(f"Удаляю пользователя '{args.nickname}' (id={target.id})...")

        try:
            delete_user_completely(
                target, session, with_owned_content=args.with_owned_content
            )
        except UserHasOwnedContentError as error:
            print(
                f"У пользователя '{args.nickname}' есть созданный им "
                f"контент — это общий контент сообщества, а не личные "
                f"данные, поэтому удалять его без явного согласия "
                f"скрипт не будет:"
            )
            for playground in error.playgrounds:
                print(f"  площадка #{playground.id}: {playground.name}")
            for event in error.events:
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
        except HTTPException as error:
            session.rollback()
            print()
            print(f"Не удалось удалить: {error.detail}")
            print(
                "Скорее всего площадку пользователя нельзя удалить, "
                "пока на неё ссылается мероприятие, созданное ДРУГИМ "
                "пользователем. Разберитесь с ним вручную и запустите "
                "скрипт заново — уже удалённые на этом прогоне "
                "мероприятия/записи дневника пользователя удалять "
                "придётся заново, они не сохранились из-за отката."
            )
            raise SystemExit(1)

        print()
        print(f"Готово. Пользователь '{args.nickname}' удалён.")


if __name__ == "__main__":
    main()
