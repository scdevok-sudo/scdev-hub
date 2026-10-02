from authlib.integrations.starlette_client import OAuth

from app.core.config import settings

GOOGLE_METADATA_URL = "https://accounts.google.com/.well-known/openid-configuration"

# El login pide solo openid/email/profile para identificar al usuario contra la
# whitelist. El scope de Calendar se pide aparte y solo a un admin, via
# /auth/google/connect-calendar (Parte E, fase 3).
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url=GOOGLE_METADATA_URL,
    client_kwargs={"scope": "openid email profile"},
)


def google_client():
    return oauth.create_client("google")
