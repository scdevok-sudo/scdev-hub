from authlib.integrations.starlette_client import OAuth

from app.core.config import settings

GOOGLE_METADATA_URL = "https://accounts.google.com/.well-known/openid-configuration"

# Parte E, fase 3: se agrega el scope de Calendar para poder crear/editar/borrar
# eventos desde la cuenta de Google con la que Santi ya tiene sesion en el Hub
# (no un calendario separado). El login sigue pidiendo openid/email/profile
# para identificar al usuario contra la whitelist -- eso no cambia.
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url=GOOGLE_METADATA_URL,
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/calendar.events"
    },
)


def google_client():
    return oauth.create_client("google")
