from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # JWT
    jwt_secret: str = "cambiame-por-un-string-largo-random"
    jwt_expire_hours: int = 168
    jwt_algorithm: str = "HS256"

    # DB
    database_url: str = ""

    # App
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    @property
    def cookie_samesite(self) -> str:
        # En prod el frontend (Vercel) y el backend (Railway) son cross-site.
        return "none" if self.is_production else "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
