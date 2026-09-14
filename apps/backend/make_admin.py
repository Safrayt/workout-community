"""
Назначение (или снятие) прав администратора пользователю.

Использование:
    docker compose exec backend python3 make_admin.py НИКНЕЙМ
    docker compose exec backend python3 make_admin.py НИКНЕЙМ --revoke

Отдельного эндпоинта в API для этого нет и не должно быть — если бы
пользователь мог сам назначить себя администратором через сайт, это
было бы дырой в безопасности, а не удобством. Поэтому, как и
delete_user.py, это разовая операция напрямую через скрипт на
сервере, а не через HTTP.

После назначения/снятия пользователю нужно перезайти на сайте —
is_admin проверяется по данным из текущего JWT-токена (см.
get_current_user в app/auth.py), а токен, выпущенный до изменения,
ничего не знает про новый статус.
"""

import argparse
import sys

sys.path.insert(0, ".")

from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models import User  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("nickname", help="nickname пользователя")
    parser.add_argument(
        "--revoke",
        action="store_true",
        help="Снять права администратора вместо назначения",
    )
    args = parser.parse_args()

    with Session(engine) as session:
        target = session.exec(
            select(User).where(User.nickname == args.nickname)
        ).first()

        if target is None:
            print(f"Пользователь '{args.nickname}' не найден.")
            raise SystemExit(1)

        new_status = not args.revoke

        if target.is_admin == new_status:
            state = "уже администратор" if new_status else "и так не администратор"
            print(f"Пользователь '{args.nickname}' {state} — ничего не меняю.")
            return

        target.is_admin = new_status
        session.add(target)
        session.commit()

        if new_status:
            print(f"Готово. '{args.nickname}' теперь администратор.")
        else:
            print(f"Готово. '{args.nickname}' больше не администратор.")

        print("Пользователю нужно перезайти на сайте, чтобы это применилось.")


if __name__ == "__main__":
    main()
