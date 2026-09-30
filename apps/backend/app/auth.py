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

# Не чаще этого интервала пишем last_seen_at в базу — иначе пришлось
# бы делать запись на каждый запрос с валидным токеном, а через
# get_current_user/get_optional_current_user проходит практически
# любой защищённый эндпоинт.
LAST_SEEN_UPDATE_INTERVAL = timedelta(minutes=5)


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


def _touch_last_seen(user: User, session: Session) -> None:
    """
    Обновляет "последнее посещение сайта" (last_seen_at, раздел
    "Пользователи") — не чаще LAST_SEEN_UPDATE_INTERVAL, см. её выше.

    SQLite (в отличие от PostgreSQL) отдаёт TIMESTAMP-колонки обратно
    как naive datetime, без информации о часовом поясе, хотя пишем мы
    туда всегда UTC (как и created_at в models.py) — поэтому naive
    значение ниже считаем уже UTC, а не сравниваем как есть с aware
    datetime.now(timezone.utc): иначе Python бросил бы TypeError на
    сравнении naive/aware datetime.
    """
    now = datetime.now(timezone.utc)
    last_seen = user.last_seen_at

    if last_seen is not None and last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    if last_seen is not None and now - last_seen < LAST_SEEN_UPDATE_INTERVAL:
        return

    user.last_seen_at = now
    session.add(user)
    session.commit()


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

    _touch_last_seen(user, session)

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

    user = session.get(User, int(user_id))

    if user is not None:
        _touch_last_seen(user, session)

    return user


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


def ensure_admin(current_user: User, detail: str = "Доступно только администратору") -> None:
    """
    Как ensure_owner_or_admin, но для ресурсов без понятия "владелец"
    вообще — например, каталог комплексов (models_complex.py):
    редактировать его может только администратор, а не "создатель",
    потому что создателя у записи каталога, в отличие от площадки или
    мероприятия, не бывает.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )