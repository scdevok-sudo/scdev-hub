import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

# El frontend guarda el JWT con esta clave en localStorage y lo manda en
# Authorization: Bearer. No se usan cookies: en Vercel serverless el frontend
# y el backend son cross-site y la cookie no sobrevive el round trip.
TOKEN_STORAGE_KEY = "scdev_token"


def create_access_token(user_id: uuid.UUID, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expire_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def extract_bearer_token(authorization: str | None) -> str | None:
    """Saca el JWT de un header Authorization: Bearer <token>."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return None
    return token.strip() or None
