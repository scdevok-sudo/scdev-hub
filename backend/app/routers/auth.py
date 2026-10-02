import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.google import CALENDAR_SCOPE, google_client
from app.auth.jwt import create_access_token, decode_access_token
from app.core.config import settings
from app.core.crypto import encrypt_token
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.google_calendar import check_connection
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


CALENDAR_CONNECT_SESSION_KEY = "calendar_connect_user_id"


@router.get("/google/login")
async def google_login(request: Request):
    # Login normal para todo el equipo: solo openid/email/profile, sin pedir Calendar.
    request.session.pop(CALENDAR_CONNECT_SESSION_KEY, None)
    return await google_client().authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/connect-calendar")
async def connect_calendar(request: Request, token: str = Query(...), db: Session = Depends(get_db)):
    """Pide el scope de Calendar. Solo admin.

    Es una navegacion del navegador (redirige a Google), asi que no puede mandar
    Authorization: Bearer: el JWT del admin viaja por query y se valida aca.
    prompt=consent + access_type=offline garantizan que Google devuelva un
    refresh_token nuevo (reemplaza al anterior).
    """
    payload = decode_access_token(token)
    user = None
    if payload:
        try:
            user = db.get(User, uuid.UUID(payload.get("sub", "")))
        except ValueError:
            user = None
    if not user or not user.is_admin:
        return RedirectResponse(f"{settings.frontend_url}/admin?calendar=forbidden")

    request.session[CALENDAR_CONNECT_SESSION_KEY] = str(user.id)
    return await google_client().authorize_redirect(
        request,
        settings.google_redirect_uri,
        scope=f"openid email profile {CALENDAR_SCOPE}",
        access_type="offline",
        prompt="consent",
        login_hint=user.email,
    )


@router.get("/calendar/status")
async def calendar_status(admin: User = Depends(require_admin)):
    """Valida con un refresh real que el token guardado siga sirviendo y tenga el scope."""
    connected, reason = check_connection(admin)
    return {"connected": connected, "reason": reason}


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    connect_user_id = request.session.pop(CALENDAR_CONNECT_SESSION_KEY, None)
    client = google_client()
    try:
        token = await client.authorize_access_token(request)
    except Exception:
        return RedirectResponse(
            f"{settings.frontend_url}/admin?calendar=error"
            if connect_user_id
            else f"{settings.frontend_url}/login?error=oauth"
        )

    info = token.get("userinfo") or await client.userinfo(token=token)
    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified", True):
        return RedirectResponse(f"{settings.frontend_url}/login?error=email")

    # Whitelist: solo los usuarios ya cargados en la tabla users pueden entrar.
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        return RedirectResponse(f"{settings.frontend_url}/login?error=not_allowed")

    user.google_id = info.get("sub") or user.google_id
    user.avatar_url = info.get("picture") or user.avatar_url
    if info.get("name"):
        user.name = info["name"]

    if connect_user_id:
        return _finish_calendar_connect(db, user, token, connect_user_id)

    db.commit()

    access_token = create_access_token(user.id, user.email, user.role)

    # Un cliente que no sea el navegador (curl, tests) pide JSON y se lleva el
    # token en el body. El navegador llega redirigido desde Google, asi que la
    # unica forma de devolverle el token es en la URL del redirect.
    if "application/json" in request.headers.get("accept", ""):
        return JSONResponse({"access_token": access_token, "token_type": "bearer"})

    return RedirectResponse(
        f"{settings.frontend_url}/auth/callback?token={quote(access_token)}"
    )


def _finish_calendar_connect(db: Session, user: User, token: dict, connect_user_id: str) -> RedirectResponse:
    base = f"{settings.frontend_url}/admin"
    # La cuenta de Google tiene que ser la del admin que inicio el flujo.
    if not user.is_admin or str(user.id) != connect_user_id:
        return RedirectResponse(f"{base}?calendar=forbidden")
    refresh_token = token.get("refresh_token")
    if not refresh_token:
        return RedirectResponse(f"{base}?calendar=error")
    # Consentimiento granular: el usuario puede destildar Calendar en el popup.
    if CALENDAR_SCOPE not in (token.get("scope") or "").split():
        return RedirectResponse(f"{base}?calendar=missing_scope")
    user.google_refresh_token = encrypt_token(refresh_token)
    db.commit()
    return RedirectResponse(f"{base}?calendar=connected")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # Sin cookie no hay nada que invalidar del lado del server: el JWT es
    # stateless y el frontend lo borra de localStorage. El endpoint queda para
    # que el cliente tenga un punto unico de logout.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
