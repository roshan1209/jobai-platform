from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from fastapi import HTTPException
from app.core.config import settings
_hasher = PasswordHash.recommended()
def hash_password(value: str) -> str: return _hasher.hash(value)


def verify_password(value: str, hashed: str) -> bool:
    try:
        return _hasher.verify(value, hashed)
    except Exception:
        return False


def make_token(uid: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": uid, "role": role, "iat": now, "exp": now+timedelta(minutes=settings.jwt_expire_minutes)}, settings.jwt_secret, algorithm="HS256")


def read_token(token: str):
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise HTTPException(401, "Invalid or expired token.") from exc
