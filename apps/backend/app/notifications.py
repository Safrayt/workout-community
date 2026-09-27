"""
Создание уведомлений — общие функции, вызываемые из разных роутеров
(diary.py, reviews.py, events.py, programs.py, complexes.py) в момент
создания комментария/отзыва. Это НЕ роутер сам по себе — REST API для
чтения и отметки уведомлений живёт в routers/notifications.py.

Обе функции ниже только session.add() — commit() делает вызывающий
код (тот же самый commit, что сохраняет сам комментарий), чтобы
комментарий и уведомления о нём попадали в одну транзакцию.
"""

import re
from typing import Iterable, Optional, Set

from sqlmodel import Session, select

from app.models import User
from app.models_notification import Notification, NotificationType

# Ник (см. _validate_nickname в models.py) может быть почти любым —
# ограничена только длина (2–32 символа), без ограничений на набор
# символов. Отметить через простое "@Ник" в тексте можно только ники
# без пробелов и экзотических символов — это осознанное упрощение
# (нет другого способа однозначно определить границу ника в тексте),
# так делает подавляющее большинство платформ с @упоминаниями.
MENTION_REGEX = re.compile(r"@([A-Za-zА-Яа-яЁё0-9_\-.]{2,32})")


def _create_notification(
    session: Session,
    *,
    recipient_id: int,
    actor: User,
    type: NotificationType,
    target_url: str,
    target_title: Optional[str],
) -> None:
    if recipient_id == actor.id:
        # Не уведомляем самого себя о собственном комментарии или
        # о том, что сам себя отметил.
        return

    session.add(
        Notification(
            user_id=recipient_id,
            actor_id=actor.id,
            type=type,
            target_url=target_url,
            target_title=target_title,
        )
    )


def notify_new_comment(
    session: Session,
    *,
    recipient_ids: Iterable[int],
    actor: User,
    type: NotificationType,
    target_url: str,
    target_title: Optional[str],
) -> None:
    """
    Уведомляет о новом комментарии каждого из recipient_ids (кроме
    самого автора комментария, если он окажется среди них —
    например, комментирует своё же мероприятие). Повторы в
    recipient_ids не создают повторных уведомлений одному и тому же
    получателю.
    """
    seen: Set[int] = set()

    for recipient_id in recipient_ids:
        if recipient_id in seen:
            continue

        seen.add(recipient_id)

        _create_notification(
            session,
            recipient_id=recipient_id,
            actor=actor,
            type=type,
            target_url=target_url,
            target_title=target_title,
        )


def notify_mentions(
    session: Session,
    *,
    text: str,
    actor: User,
    target_url: str,
    target_title: Optional[str],
) -> None:
    """
    Ищет в тексте комментария @Ник и уведомляет каждого найденного
    существующего пользователя (кроме самого автора). Один и тот же
    пользователь, упомянутый несколько раз в одном тексте, получает
    только одно уведомление.
    """
    nicknames = {match.group(1) for match in MENTION_REGEX.finditer(text)}

    if not nicknames:
        return

    already_notified: Set[int] = set()

    for nickname in nicknames:
        mentioned_user = session.exec(
            select(User).where(User.nickname.ilike(nickname))
        ).first()

        if mentioned_user is None:
            continue

        if mentioned_user.id == actor.id:
            continue

        if mentioned_user.id in already_notified:
            continue

        already_notified.add(mentioned_user.id)

        _create_notification(
            session,
            recipient_id=mentioned_user.id,
            actor=actor,
            type=NotificationType.mention,
            target_url=target_url,
            target_title=target_title,
        )
