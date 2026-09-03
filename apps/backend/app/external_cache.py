"""
Простой in-memory TTL-кэш для ответов внешних сервисов (погода,
геокодирование) — см. app/routers/external.py.

Как и app/rate_limit.py, не переживает перезапуск процесса и не
шарится между несколькими воркерами uvicorn — для одного процесса
этого достаточно, при масштабировании на несколько воркеров нужен
будет общий стор (Redis и т.п.), см. DEPLOY.md.
"""

import time
from typing import Any, Dict, Optional, Tuple


class TTLCache:
    def __init__(self, ttl_seconds: float):
        self.ttl_seconds = ttl_seconds
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)

        if entry is None:
            return None

        expires_at, value = entry

        if time.monotonic() > expires_at:
            del self._store[key]
            return None

        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.monotonic() + self.ttl_seconds, value)
