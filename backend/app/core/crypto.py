"""Encriptacion simetrica del refresh_token de Google (Parte E, fase 3).

No habia ningun mecanismo de secretos/encriptacion en el proyecto antes de
esto (se reviso config.py y requirements.txt: solo JWT signing con
python-jose, nada de Fernet ni de una key simetrica de aplicacion). Se usa
`cryptography.fernet.Fernet`, que ya esta disponible como dependencia
transitiva de `python-jose[cryptography]` -- no hizo falta agregar nada a
requirements.txt.
"""

from functools import lru_cache

from cryptography.fernet import Fernet

from app.core.config import settings


@lru_cache
def _fernet() -> Fernet:
    if not settings.google_token_encryption_key:
        raise RuntimeError(
            "Falta GOOGLE_TOKEN_ENCRYPTION_KEY en el .env -- generar con "
            "`python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"`"
        )
    return Fernet(settings.google_token_encryption_key.encode())


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _fernet().decrypt(encrypted.encode()).decode()
