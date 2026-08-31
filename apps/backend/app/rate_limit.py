"""
Простой rate limiter на уровне приложения — защита от перебора
пароля/спама регистраций, которая работает сама по себе, даже если
что-то пойдёт не так с настройками nginx (или пока его ещё не
настроили). На проде основной барьер всё равно должен стоять в
nginx (limit_req) — он общий для всех воркеров и переживает
перезапуск процесса; этот лимитер — только дополнительный слой и
хранит счётчики в памяти одного процесса.

Не рассчитан на несколько процессов uvicorn за балансировщиком —
для такого масштаба нужен общий стор (Redis и т.п.). Для этого
проекта (один процесс, SQLite) — этого достаточно.
"""

import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, Request, status


def _client_ip(request: Request) -> str:
    """
    В проде uvicorn слушает только на 127.0.0.1 и недоступен напрямую
    из интернета — весь трафик идёт через nginx, который сам
    выставляет X-Forwarded-For (см. деплой-конфиг), так что этому
    заголовку можно доверять. В разработке (без nginx) просто
    используется адрес подключения.
    """
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


class RateLimiter:
    """
    Ограничивает число запросов с одного IP за скользящее окно
    времени. Используется как FastAPI-зависимость:

        @router.post("/login", dependencies=[Depends(RateLimiter(10, 300))])
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, List[float]] = defaultdict(list)

    def __call__(self, request: Request) -> None:
        key = _client_ip(request)
        now = time.monotonic()
        window_start = now - self.window_seconds

        recent_hits = [t for t in self._hits[key] if t > window_start]

        if len(recent_hits) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много попыток. Попробуйте позже.",
            )

        recent_hits.append(now)
        self._hits[key] = recent_hits
