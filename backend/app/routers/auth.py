from urllib.parse import quote

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.google import google_client
from app.auth.jwt import create_access_token
from app.core.config import settings
from app.core.crypto import encrypt_token
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
async def google_login(request: Request):
    client = google_client()
    # access_type=offline pide que Google devuelva un refresh_token (Parte E,
    # fase 3, integracion con Calendar). prompt=consent va SIEMPRE, no solo la
    # primera vez: sin el, un usuario que ya autorizo antes no vuelve a recibir
    # el refresh_token en logins posteriores -- es el detalle mas facil de
    # romper de todo este cambio, ver fase-3-calendario-subtareas-admin.md.
    return await client.authorize_redirect(
        request, settings.google_redirect_uri, access_type="offline", prompt="consent"
    )


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    client = google_client()
    try:
        token = await client.authorize_access_token(request)
    except Exception:
        return RedirectResponse(f"{settings.frontend_url}/login?error=oauth")

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

    # Google solo manda refresh_token cuando access_type=offline + prompt=consent
    # dieron resultado (ver google_login). Si no vino, no se pisa el que ya
    # hubiera guardado -- puede ser un login normal sin necesidad de reconsentir.
    refresh_token = token.get("refresh_token")
    if refresh_token:
        user.google_refresh_token = encrypt_token(refresh_token)

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


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # Sin cookie no hay nada que invalidar del lado del server: el JWT es
    # stateless y el frontend lo borra de localStorage. El endpoint queda para
    # que el cliente tenga un punto unico de logout.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
