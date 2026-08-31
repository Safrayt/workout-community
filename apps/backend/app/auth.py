from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.config import SECRET_KEY
from app.database import get_session
from app.models import User

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # токен действует 24 часа

# Указывает Swagger UI, куда отправлять логин/пароль для получения
# токена, когда вы нажимаете кнопку "Authorize" на странице /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    """Превращает пароль в необратимый хеш для хранения в базе."""
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Проверяет, соответствует ли введённый пароль сохранённому хешу."""
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def create_access_token(user_id: int) -> str:
    """Создаёт подписанный токен, привязанный к id пользователя."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),  # "subject" — кому выдан токен
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """
    Зависимость для защищённых эндпоинтов.
    Достаёт токен из заголовка Authorization, проверяет подпись и срок
    действия, находит пользователя в базе. Если что-то не так — 401.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")

        if user_id is None:
            raise credentials_error
    except jwt.PyJWTError:
        raise credentials_error

    user = session.get(User, int(user_id))

    if user is None:
        raise credentials_error

    return user


# auto_error=False — в отличие от oauth2_scheme выше, не бросает 401,
# если заголовка Authorization вообще нет, а просто отдаёт None.
_optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/login", auto_error=False
)


def get_optional_current_user(
    token: Optional[str] = Depends(_optional_oauth2_scheme),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """
    Как get_current_user, но для эндпоинтов, где авторизация не
    обязательна, а нужна только чтобы отличить "свою" страницу от
    "чужой" — например, дневник: смотреть его может кто угодно, а
    вот проверка privacySettings.diaryVisible зависит от того, чей
    сейчас токен, если он вообще есть. Токен есть, но невалиден —
    тоже просто None, не 401: до самого эндпоинта тут дела нет.
    """
    if token is None:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")

        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None

    return session.get(User, int(user_id))


def ensure_owner_or_admin(
    owner_id: int,
    current_user: User,
    detail: str,
) -> None:
    """
    Общая проверка для эндпоинтов вида "менять/удалять может только
    автор" (площадки, мероприятия, отзывы и т.п.) — с добавлением
    того, что администратору (is_admin) можно всегда, независимо от
    того, кто автор. Используется вместо точечных сравнений
    `X.creator_id != current_user.id` в роутерах, чтобы обход для
    админа не пришлось задавать в каждом месте отдельно и не забыть
    где-то одном.
    """
    if current_user.is_admin:
        return

    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )