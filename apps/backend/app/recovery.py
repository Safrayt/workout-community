"""
Ключ восстановления аккаунта.

На портале нет ни почты, ни телефона — единственное, чем пользователь
может подтвердить, что аккаунт его, это секрет, который он сам сохранил.
Таким секретом и служит ключ восстановления: длинная случайная строка,
которая показывается пользователю ОДИН раз (при регистрации или при
создании нового ключа в настройках), а на сервере хранится только её
хеш — как и пароль. Потерять ключ, как и пароль, можно, но украсть его
из базы данных нельзя.

Ключ одноразовый: при восстановлении доступа по нему тут же выпускается
новый (см. routers/auth.py, recover_account), а старый перестаёт
работать.
"""

import re
import secrets

from app.auth import hash_password, verify_password

# Алфавит Крокфорда (Crockford base32): цифры и латинские буквы без
# I, L, O, U — их легко спутать с 1 и 0 или между собой при переписывании
# от руки. 32 символа = 5 бит на символ.
RECOVERY_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

# 24 символа × 5 бит = 120 бит случайности — перебор невозможен
# физически, даже без ограничения числа попыток.
RECOVERY_KEY_LENGTH = 24

# Для читаемости ключ показывается группами: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX.
RECOVERY_KEY_GROUP_SIZE = 4

# Символы, которые при вводе спутать проще всего — как в самом
# алфавите Крокфорда, при вводе принимаем их как цифры.
_LOOKALIKES = str.maketrans({"O": "0", "I": "1", "L": "1"})


def generate_recovery_key() -> str:
    """Новый случайный ключ в виде, удобном для показа пользователю."""
    raw = "".join(
        secrets.choice(RECOVERY_KEY_ALPHABET)
        for _ in range(RECOVERY_KEY_LENGTH)
    )

    return "-".join(
        raw[index : index + RECOVERY_KEY_GROUP_SIZE]
        for index in range(0, RECOVERY_KEY_LENGTH, RECOVERY_KEY_GROUP_SIZE)
    )


def normalize_recovery_key(value: str) -> str:
    """
    Приводит введённый пользователем ключ к каноническому виду: без
    дефисов и пробелов, в верхнем регистре, с исправлением похожих
    символов (O → 0, I/L → 1). Так ключ принимается и с дефисами, и без
    них, и в любом регистре — вводить его часто приходится с бумаги.
    """
    letters_and_digits = re.sub(r"[^0-9A-Za-z]", "", value)

    return letters_and_digits.upper().translate(_LOOKALIKES)


def hash_recovery_key(key: str) -> str:
    """Хеш для хранения в базе (тот же bcrypt, что и для паролей)."""
    return hash_password(normalize_recovery_key(key))


def verify_recovery_key(key: str, key_hash: str) -> bool:
    """Проверяет введённый ключ по сохранённому хешу."""
    normalized = normalize_recovery_key(key)

    # Ключ неправильной длины заведомо не подходит; проверку по хешу
    # всё равно выполняем (на заведомо неверном значении), чтобы время
    # ответа не выдавало, что ключ введён с опечаткой в длине.
    if len(normalized) != RECOVERY_KEY_LENGTH:
        verify_password(normalized or "-", key_hash)
        return False

    return verify_password(normalized, key_hash)
