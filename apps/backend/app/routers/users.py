from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserRead, UserUpdate

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


@router.put("/me", response_model=UserRead)
def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> User:
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
