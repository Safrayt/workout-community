import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.database import get_session
from app.models import User

# Секретный ключ, которым подписываются токены. В разработке подходит
# значение по умолчанию, но в проде ОБЯЗАТЕЛЬНО задать свой через
# переменную окружения SECRET_KEY — иначе кто угодно, кто знает этот
# ключ, сможет подделать токен от имени любого пользователя.
SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "dev-only-secret-change-me",
)
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
