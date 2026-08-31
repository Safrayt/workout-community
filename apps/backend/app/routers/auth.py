from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_session
from app.models import User, UserCreate, UserRead
from app.rate_limit import RateLimiter
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

# Ограничения подобраны так, чтобы не мешать обычному использованию
# (в том числе нескольким людям за одним NAT/офисным IP), но заметно
# затруднить автоматический перебор пароля или массовую регистрацию.
_login_rate_limit = RateLimiter(max_requests=10, window_seconds=300)
_register_rate_limit = RateLimiter(max_requests=5, window_seconds=600)

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


@router.post(
    "/register",
    response_model=TokenResponse,
    dependencies=[Depends(_register_rate_limit)],
)
def register(
    user_data: UserCreate,
    session: Session = Depends(get_session),
) -> TokenResponse:
    """
    Регистрирует нового пользователя и сразу выдаёт токен —
    чтобы после регистрации не нужно было отдельно логиниться.
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

    user = User(
        **user_fields,
        password_hash=hash_password(user_data.password),
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    access_token = create_access_token(user_id=user.id)

    return TokenResponse(access_token=access_token)


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

    access_token = create_access_token(user_id=user.id)

    return TokenResponse(access_token=access_token)
