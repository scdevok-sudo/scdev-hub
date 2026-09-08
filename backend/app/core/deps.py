import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token, extract_bearer_token
from app.core.database import get_db
from app.models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = extract_bearer_token(request.headers.get("authorization"))

    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada")

    try:
        user_id = uuid.UUID(payload.get("sub", ""))
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida") from None

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario inexistente")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requiere permisos de admin")
    return user
