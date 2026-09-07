"""Entrypoint alternativo: `uvicorn main:app`. El canonico es `app.main:app`."""

from app.main import app

__all__ = ["app"]
