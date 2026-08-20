from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user, get_optional_current_user
from app.database import get_session
from app.models import User
from app.models_playground import Playground, PlaygroundRead
from app.models_social import (
    PlaygroundFavorite,
    PlaygroundFavoriteRead,
    Subscription,
    SubscriptionRead,
)
from app.routers.playgrounds import _to_playground_read

router = APIRouter(tags=["social"])


# =====================================================================
# Подписки
# =====================================================================

def _find_subscription(
    follower_id: int, following_id: int, session: Session
) -> Optional[Subscription]:
    return session.exec(
        select(Subscription).where(
            Subscription.follower_id == follower_id,
            Subscription.following_id == following_id,
        )
    ).first()


@router.post("/subscriptions/{following_id}", response_model=SubscriptionRead)
def subscribe(
    following_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Subscription:
    """
    Подписаться на пользователя. Идемпотентно: повторный вызов не
    создаёт дубль, а просто отдаёт уже существующую подписку — как
    subscribe() в SubscriptionContext.tsx, который тоже тихо ничего
    не делает при повторном вызове вместо ошибки.
    """
    if following_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Нельзя подписаться на самого себя"
        )

    if session.get(User, following_id) is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = _find_subscription(current_user.id, following_id, session)

    if existing is not None:
        return existing

    subscription = Subscription(
        follower_id=current_user.id, following_id=following_id
    )

    session.add(subscription)
    session.commit()
    session.refresh(subscription)

    return subscription


@router.delete(
    "/subscriptions/{following_id}", status_code=status.HTTP_204_NO_CONTENT
)
def unsubscribe(
    following_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Идемпотентно: отписка от того, на кого не подписан — не ошибка."""
    existing = _find_subscription(current_user.id, following_id, session)

    if existing is not None:
        session.delete(existing)
        session.commit()


@router.get("/subscriptions", response_model=List[SubscriptionRead])
def list_subscriptions(
    follower_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[Subscription]:
    """
    Список подписок пользователя (на кого он подписан) — от новых к
    старым, как getFollowingIds на фронтенде. Список подписчиков
    (кто подписан на него) в приложении нигде не используется, поэтому
    отдельного эндпоинта под это нет.
    """
    owner = session.get(User, follower_id)

    if owner is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not owner.subscriptions_visible:
        if viewer is None or viewer.id != owner.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Список подписок этого пользователя скрыт "
                    "настройками приватности"
                ),
            )

    subscriptions = session.exec(
        select(Subscription)
        .where(Subscription.follower_id == follower_id)
        .order_by(Subscription.created_at.desc())
    ).all()

    return list(subscriptions)


@router.get("/subscriptions/check", response_model=bool)
def check_subscription(
    following_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> bool:
    """Подписан ли текущий пользователь на following_id — для кнопки
    "Подписаться"/"Отписаться" на чужом профиле."""
    return (
        _find_subscription(current_user.id, following_id, session)
        is not None
    )


# =====================================================================
# Избранные площадки
# =====================================================================
# В отличие от дневника и подписок, у избранного нет своей настройки
# приватности (нет favoritesVisible в PrivacySettings на фронтенде) —
# значит, это чисто личный список, чужой посмотреть в принципе не
# может, публичного GET по user_id тут намеренно нет.

def _find_favorite(
    user_id: int, playground_id: int, session: Session
) -> Optional[PlaygroundFavorite]:
    return session.exec(
        select(PlaygroundFavorite).where(
            PlaygroundFavorite.user_id == user_id,
            PlaygroundFavorite.playground_id == playground_id,
        )
    ).first()


@router.post(
    "/favorites/{playground_id}", response_model=PlaygroundFavoriteRead
)
def add_favorite(
    playground_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundFavorite:
    """Идемпотентно — как addFavorite в FavoriteContext.tsx."""
    if session.get(Playground, playground_id) is None:
        raise HTTPException(status_code=404, detail="Площадка не найдена")

    existing = _find_favorite(current_user.id, playground_id, session)

    if existing is not None:
        return existing

    favorite = PlaygroundFavorite(
        user_id=current_user.id, playground_id=playground_id
    )

    session.add(favorite)
    session.commit()
    session.refresh(favorite)

    return favorite


@router.delete(
    "/favorites/{playground_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_favorite(
    playground_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    existing = _find_favorite(current_user.id, playground_id, session)

    if existing is not None:
        session.delete(existing)
        session.commit()


@router.get("/favorites", response_model=List[PlaygroundRead])
def list_favorites(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[PlaygroundRead]:
    """
    Сразу площадки целиком (а не просто список favorite-записей) — как
    getFavoritePlaygrounds на фронтенде, которая тоже возвращает
    Playground[], а не PlaygroundFavorite[]: экрану "Избранное" нужны
    карточки площадок, а не сырые связи.
    """
    favorites = session.exec(
        select(PlaygroundFavorite).where(
            PlaygroundFavorite.user_id == current_user.id
        )
    ).all()

    playgrounds = [
        session.get(Playground, favorite.playground_id)
        for favorite in favorites
    ]

    return [
        _to_playground_read(pg, session)
        for pg in playgrounds
        if pg is not None
    ]


@router.get("/favorites/check", response_model=bool)
def check_favorite(
    playground_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> bool:
    return (
        _find_favorite(current_user.id, playground_id, session) is not None
    )
