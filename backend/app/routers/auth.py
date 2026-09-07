from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.google import google_client
from app.auth.jwt import COOKIE_NAME, create_access_token
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expire_hours * 3600,
        path="/",
    )


@router.get("/google/login")
async def google_login(request: Request):
    client = google_client()
    return await client.authorize_redirect(request, settings.google_redirect_uri)


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
    db.commit()

    access_token = create_access_token(user.id, user.email, user.role)
    response = RedirectResponse(settings.frontend_url)
    _set_cookie(response, access_token)
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
