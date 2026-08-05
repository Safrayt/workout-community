from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Возвращает профиль пользователя, которому принадлежит переданный
    токен. Это защищённый эндпоинт — без валидного токена ответит 401.
    """
    return current_user


@router.get("/", response_model=list[UserRead])
def list_users(
    session: Session = Depends(get_session),
) -> list[User]:
    """Возвращает список всех пользователей."""
    users = session.exec(select(User)).all()

    return list(users)


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
