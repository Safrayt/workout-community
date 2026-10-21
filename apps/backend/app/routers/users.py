from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, SQLModel, select

from app.auth import (
    create_access_token,
    ensure_admin,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_session
from app.models import (
    AccountDeletion,
    CurrentUserRead,
    PasswordChange,
    RecoveryKeyRegenerate,
    User,
    UserRead,
    UserUpdate,
)
from app.rate_limit import RateLimiter
from app.recovery import generate_recovery_key, hash_recovery_key
from app.routers.auth import TokenResponse
from app.user_deletion import UserHasOwnedContentError, delete_user_completely

router = APIRouter(prefix="/users", tags=["users"])

# Эндпоинты ниже требуют текущий пароль — то есть дают возможность его
# подбирать тому, у кого оказался чужой токен, поэтому лимит такой же
# строгий, как у входа.
_password_check_rate_limit = RateLimiter(max_requests=10, window_seconds=300)


def _to_current_user_read(user: User) -> CurrentUserRead:
    return CurrentUserRead(
        **UserRead.model_validate(user).model_dump(),
        has_recovery_key=user.recovery_key_hash is not None,
    )


class RecoveryKeyResponse(BaseModel):
    """Новый ключ восстановления — показывается пользователю один раз."""

    recovery_key: str


@router.get("/me", response_model=CurrentUserRead)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> CurrentUserRead:
    """
    Возвращает профиль пользователя, которому принадлежит переданный
    токен. Это защищённый эндпоинт — без валидного токена ответит 401.
    """
    return _to_current_user_read(current_user)


@router.post(
    "/me/password",
    response_model=TokenResponse,
    dependencies=[Depends(_password_check_rate_limit)],
)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TokenResponse:
    """
    Смена пароля. Нужен текущий пароль — иначе любой, кто получил
    доступ к открытой сессии, мог бы навсегда закрепить аккаунт за
    собой. Все остальные сессии (токены) после смены перестают
    работать; в ответе приходит новый токен для текущего устройства.

    Ошибки — 400, а не 401: фронтенд на 401 считает, что сессия
    истекла, и выкидывает на страницу входа.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Неверный текущий пароль"
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="Новый пароль должен отличаться от текущего",
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.token_version += 1

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return TokenResponse(
        access_token=create_access_token(
            user_id=current_user.id,
            token_version=current_user.token_version,
        )
    )


@router.post(
    "/me/recovery-key",
    response_model=RecoveryKeyResponse,
    dependencies=[Depends(_password_check_rate_limit)],
)
def regenerate_recovery_key(
    data: RecoveryKeyRegenerate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RecoveryKeyResponse:
    """
    Создаёт новый ключ восстановления (для аккаунтов без ключа — первый,
    для остальных — взамен прежнего, который сразу перестаёт работать).
    Нужен текущий пароль. Сам ключ нигде не хранится — только хеш — и
    показывается пользователю один раз, в этом ответе.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Неверный текущий пароль"
        )

    recovery_key = generate_recovery_key()

    current_user.recovery_key_hash = hash_recovery_key(recovery_key)
    current_user.recovery_key_created_at = datetime.now(timezone.utc)

    session.add(current_user)
    session.commit()

    return RecoveryKeyResponse(recovery_key=recovery_key)


@router.put("/me", response_model=CurrentUserRead)
def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CurrentUserRead:
    """
    Обновляет профиль текущего пользователя: имя, город, био, аватар,
    соцсети и настройки приватности (EditProfile и AccountSettings
    на фронтенде). exclude_unset=True — как и в PlaygroundUpdate,
    трогаем только реально переданные поля.
    """
    updates = data.model_dump(exclude_unset=True)

    for field_name, value in updates.items():
        setattr(current_user, field_name, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return _to_current_user_read(current_user)


def _describe_owned_content(error: UserHasOwnedContentError) -> str:
    """Человекочитаемый список: «площадки: A, B; мероприятия: C»."""
    parts = []

    if error.playgrounds:
        parts.append(
            "площадки: " + ", ".join(p.name for p in error.playgrounds)
        )
    if error.events:
        parts.append(
            "мероприятия: " + ", ".join(e.title for e in error.events)
        )
    if error.programs:
        parts.append(
            "программы: " + ", ".join(p.title for p in error.programs)
        )

    return "; ".join(parts)


@router.post(
    "/me/delete",
    status_code=204,
    dependencies=[Depends(_password_check_rate_limit)],
)
def delete_current_user(
    data: AccountDeletion,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Удаление собственного аккаунта. Нужен текущий пароль — чтобы тот,
    кто получил доступ к чужой открытой сессии, не мог уничтожить
    аккаунт. Логика та же, что у админского удаления и консольного
    delete_user.py (app/user_deletion.py): личные данные удаляются
    всегда и необратимо.

    Если у пользователя есть свои площадки/мероприятия/программы —
    это общий контент сообщества, поэтому без with_owned_content=true
    отвечаем 409 со списком и ничего не удаляем.

    POST, а не DELETE: у DELETE-запросов тело нестандартно и часть
    прокси/клиентов его отбрасывает, а пароль должен ехать именно в
    теле, а не в адресной строке (попадёт в логи).
    """
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный пароль")

    # Последнего администратора не удаляем — иначе портал останется
    # без модерации, а вернуть права можно будет только руками в БД.
    if current_user.is_admin:
        other_admin = session.exec(
            select(User).where(
                User.is_admin == True,  # noqa: E712
                User.id != current_user.id,
            )
        ).first()

        if other_admin is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Вы единственный администратор портала. Сначала "
                    "назначьте другого администратора."
                ),
            )

    try:
        delete_user_completely(
            current_user,
            session,
            with_owned_content=data.with_owned_content,
        )
    except UserHasOwnedContentError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "Вы создали контент, которым пользуются другие люди — "
                f"{_describe_owned_content(error)}. Он будет удалён "
                "вместе с аккаунтом."
            ),
        )
    except HTTPException:
        session.rollback()
        raise


@router.get("/", response_model=list[UserRead])
def list_users(
    session: Session = Depends(get_session),
) -> list[User]:
    """Возвращает список всех пользователей."""
    users = session.exec(select(User)).all()

    return list(users)


@router.get("/by-username/{username}", response_model=UserRead)
def get_user_by_username(
    username: str,
    session: Session = Depends(get_session),
) -> User:
    """
    Поиск по nickname (регистронезависимо) — для публичных профилей
    вида /u/:username на фронтенде. Объявлен ДО GET /{user_id}: путь
    здесь из двух сегментов ("by-username" + значение), а не из
    одного, так что с {user_id}: int в принципе не пересекается,
    независимо от порядка — но держим рядом с остальными
    /users/... для читаемости.
    """
    user = session.exec(
        select(User).where(User.nickname.ilike(username))
    ).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
) -> User:
    """Возвращает одного пользователя по id или 404, если не найден."""
    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# =====================================================================
# Раздел "Пользователи" в админ-панели (видна и доступна только
# администратору — см. RequireAdmin на фронтенде).
# =====================================================================

class FeedRestrictionUpdate(SQLModel):
    is_feed_restricted: bool


@router.put("/{user_id}/feed-restriction", response_model=UserRead)
def set_feed_restriction(
    user_id: int,
    data: FeedRestrictionUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> User:
    """
    Убрать (или вернуть) публикации пользователя из общей ленты на
    Главной — не удаляет их и не трогает страницу его собственного
    дневника, только перестаёт показывать в "Все записи"/"Подписки"
    (см. _visible_diary_user_ids в routers/diary.py).
    """
    ensure_admin(
        current_user,
        "Ограничивать публикации в ленте может только администратор",
    )

    target = session.get(User, user_id)

    if target is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    target.is_feed_restricted = data.is_feed_restricted
    session.add(target)
    session.commit()
    session.refresh(target)

    return target


@router.delete("/{user_id}", status_code=204)
def admin_delete_user(
    user_id: int,
    with_owned_content: bool = False,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Полное удаление пользователя вместе со всеми его данными — та же
    логика, что и у консольного delete_user.py (см. app/user_deletion.py),
    просто доступная через раздел "Пользователи" на сайте.
    """
    ensure_admin(current_user, "Удалять пользователей может только администратор")

    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить самого себя через админ-панель.",
        )

    target = session.get(User, user_id)

    if target is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    try:
        delete_user_completely(
            target, session, with_owned_content=with_owned_content
        )
    except UserHasOwnedContentError as error:
        parts = [_describe_owned_content(error)]

        raise HTTPException(
            status_code=400,
            detail=(
                "У пользователя есть свои площадки/мероприятия/программы "
                f"({'; '.join(parts)}) — это общий контент сообщества. "
                "Повторите запрос с ?with_owned_content=true, чтобы "
                "удалить их вместе с пользователем (необратимо), или "
                "сначала переназначьте их другому автору вручную."
            ),
        )
    except HTTPException:
        session.rollback()
        raise
