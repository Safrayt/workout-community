from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.models_playground import Playground
from app.models_review import (
    PlaygroundReview,
    PlaygroundReviewCreate,
    PlaygroundReviewRead,
    PlaygroundReviewUpdate,
)

router = APIRouter(prefix="/reviews", tags=["reviews"])

# Совпадает с REVIEW_TEXT_MIN_LENGTH в validation/review.ts на фронте.
REVIEW_TEXT_MIN_LENGTH = 10


def _validate_review_text(text: str) -> str:
    trimmed = text.strip()

    if len(trimmed) == 0:
        raise HTTPException(status_code=400, detail="Напишите текст отзыва.")

    if len(trimmed) < REVIEW_TEXT_MIN_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Отзыв должен содержать не менее "
                f"{REVIEW_TEXT_MIN_LENGTH} символов."
            ),
        )

    return trimmed


@router.post("/", response_model=PlaygroundReviewRead)
def create_review(
    data: PlaygroundReviewCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundReview:
    """
    Один пользователь может оставить сколько угодно отзывов на одну
    и ту же площадку — на фронтенде (ReviewContext.addReview) такого
    ограничения нет, поэтому и здесь его не добавляем.
    """
    if session.get(Playground, data.playground_id) is None:
        raise HTTPException(status_code=404, detail="Площадка не найдена")

    trimmed_text = _validate_review_text(data.text)

    review = PlaygroundReview(
        playground_id=data.playground_id,
        user_id=current_user.id,
        text=trimmed_text,
    )

    session.add(review)
    session.commit()
    session.refresh(review)

    return review


@router.get("/", response_model=List[PlaygroundReviewRead])
def list_reviews(
    playground_id: int,
    session: Session = Depends(get_session),
) -> List[PlaygroundReview]:
    """
    Отзывы одной площадки, от новых к старым — так же, как
    getPlaygroundReviews на фронтенде сортирует их для страницы
    площадки и списка всех отзывов.
    """
    reviews = session.exec(
        select(PlaygroundReview)
        .where(PlaygroundReview.playground_id == playground_id)
        .order_by(PlaygroundReview.created_at.desc())
    ).all()

    return list(reviews)


def _get_review_or_404(review_id: int, session: Session) -> PlaygroundReview:
    review = session.get(PlaygroundReview, review_id)

    if review is None:
        raise HTTPException(status_code=404, detail="Отзыв не найден")

    return review


@router.put("/{review_id}", response_model=PlaygroundReviewRead)
def update_review(
    review_id: int,
    data: PlaygroundReviewUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundReview:
    review = _get_review_or_404(review_id, session)

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Редактировать этот отзыв может только его автор",
        )

    review.text = _validate_review_text(data.text)

    session.add(review)
    session.commit()
    session.refresh(review)

    return review


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    review = _get_review_or_404(review_id, session)

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Удалять этот отзыв может только его автор",
        )

    session.delete(review)
    session.commit()
