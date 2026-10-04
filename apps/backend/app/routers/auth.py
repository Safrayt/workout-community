from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_session
from app.models import AccountRecovery, User, UserCreate, UserRead
from app.rate_limit import RateLimiter
from app.recovery import (
    generate_recovery_key,
    hash_recovery_key,
    verify_recovery_key,
)
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

# Ограничения подобраны так, чтобы не мешать обычному использованию
# (в том числе нескольким людям за одним NAT/офисным IP), но заметно
# затруднить автоматический перебор пароля или массовую регистрацию.
_login_rate_limit = RateLimiter(max_requests=10, window_seconds=300)
_register_rate_limit = RateLimiter(max_requests=5, window_seconds=600)

# Восстановление по ключу: общий лимит с одного IP плюс отдельный лимит
# на неудачные попытки по конкретному nickname — чтобы нельзя было
# перебирать ключи к одному аккаунту, меняя IP. Ключ в 120 бит перебрать
# невозможно и без лимита; лимит нужен, чтобы не давать бесконечно
# нагружать сервер (каждая проверка — bcrypt) и не оставлять открытой
# возможность подбора, если когда-то ключи станут короче.
_recover_rate_limit = RateLimiter(max_requests=10, window_seconds=900)
_recover_nickname_limit = RateLimiter(max_requests=5, window_seconds=900)

# Используется в login(), когда пользователь с таким nickname не
# найден — см. комментарий там про тайминг-атаку.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-constant-time-check")


class TokenResponse(BaseModel):
    """
    Ответ при успешном входе/регистрации.
    token_type: "bearer" — стандартное значение, которое ожидает
    заголовок Authorization: Bearer <token>.
    """

    access_token: str
    token_type: str = "bearer"


class TokenWithRecoveryKey(TokenResponse):
    """
    Ответ при регистрации и при восстановлении доступа: токен входа
    плюс НОВЫЙ ключ восстановления. Ключ показывается пользователю
    один раз — на сервере остаётся только его хеш, повторно получить
    ключ нельзя, можно лишь создать новый (см. routers/users.py).
    """

    recovery_key: str


@router.post(
    "/register",
    response_model=TokenWithRecoveryKey,
    dependencies=[Depends(_register_rate_limit)],
)
def register(
    user_data: UserCreate,
    session: Session = Depends(get_session),
) -> TokenWithRecoveryKey:
    """
    Регистрирует нового пользователя и сразу выдаёт токен —
    чтобы после регистрации не нужно было отдельно логиниться — и
    ключ восстановления доступа (единственный способ вернуть аккаунт
    при потере пароля: почты и других контактов портал не хранит).
    """
    existing_user = session.exec(
        select(User).where(User.nickname == user_data.nickname)
    ).first()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким nickname уже существует",
        )

    # model_dump с exclude — а не перечисление полей вручную, — чтобы
    # соцсети/приватность (UserBase) не забывались молча при каждом
    # новом поле, которое добавится в профиль в будущем.
    user_fields = user_data.model_dump(exclude={"password"})

    recovery_key = generate_recovery_key()

    user = User(
        **user_fields,
        password_hash=hash_password(user_data.password),
        recovery_key_hash=hash_recovery_key(recovery_key),
        recovery_key_created_at=datetime.now(timezone.utc),
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    access_token = create_access_token(
        user_id=user.id, token_version=user.token_version
    )

    return TokenWithRecoveryKey(
        access_token=access_token,
        recovery_key=recovery_key,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(_login_rate_limit)],
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> TokenResponse:
    """
    Вход по nickname и паролю.
    Swagger UI показывает это как форму "username"/"password" —
    в нашем случае в поле "username" нужно вводить nickname.
    """
    user = session.exec(
        select(User).where(User.nickname == form_data.username)
    ).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный nickname или пароль",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Пароль проверяем даже для несуществующего пользователя (против
    # заведомо неверного хеша-заглушки) — иначе ответ для
    # "нет такого nickname" стабильно приходит быстрее, чем для
    # "nickname есть, пароль неверный", и по разнице во времени
    # ответа можно перебором узнавать существующие никнеймы, даже
    # не имея доступа к паролям.
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    password_is_valid = verify_password(form_data.password, password_hash)

    if user is None or not password_is_valid:
        raise invalid_credentials

    access_token = create_access_token(
        user_id=user.id, token_version=user.token_version
    )

    return TokenResponse(access_token=access_token)


@router.post(
    "/recover",
    response_model=TokenWithRecoveryKey,
    dependencies=[Depends(_recover_rate_limit)],
)
def recover_account(
    data: AccountRecovery,
    session: Session = Depends(get_session),
) -> TokenWithRecoveryKey:
    """
    Сброс забытого пароля по ключу восстановления (ник + ключ + новый
    пароль). При успехе:
    - пароль заменяется на новый;
    - все ранее выданные токены перестают работать (token_version);
    - использованный ключ перестаёт работать, вместо него выпускается
      новый — он возвращается в ответе и должен быть сохранён заново;
    - сразу выдаётся токен входа, отдельно логиниться не нужно.
    """
    nickname = data.nickname.strip()

    _recover_nickname_limit.ensure_allowed(nickname)

    user = session.exec(
        select(User).where(User.nickname == nickname)
    ).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный ник или ключ восстановления",
    )

    # Как и в login(): проверяем ключ даже для несуществующего
    # пользователя или пользователя без ключа (против хеша-заглушки),
    # чтобы по времени ответа нельзя было узнать, существует ли ник.
    key_hash = (
        user.recovery_key_hash
        if user is not None and user.recovery_key_hash
        else _DUMMY_PASSWORD_HASH
    )
    key_is_valid = verify_recovery_key(data.recovery_key, key_hash)

    if user is None or not user.recovery_key_hash or not key_is_valid:
        # Считаем только неудачные попытки: успешное восстановление
        # законного владельца не должно приближать его к блокировке.
        _recover_nickname_limit.record(nickname)

        raise invalid_credentials

    new_recovery_key = generate_recovery_key()

    user.password_hash = hash_password(data.new_password)
    user.token_version += 1
    user.recovery_key_hash = hash_recovery_key(new_recovery_key)
    user.recovery_key_created_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()
    session.refresh(user)

    access_token = create_access_token(
        user_id=user.id, token_version=user.token_version
    )

    return TokenWithRecoveryKey(
        access_token=access_token,
        recovery_key=new_recovery_key,
    )
