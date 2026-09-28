from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers import (
    admin_tasks,
    auth,
    clients,
    dashboard,
    finance,
    invoices,
    pricing,
    project_milestones,
    projects,
    tasks,
    time_logs,
    users,
)

app = FastAPI(title="SCdev Hub API", version="1.0.0")

# Authlib guarda el state del flujo OAuth en la sesion de Starlette.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    same_site=settings.cookie_samesite,
    https_only=settings.cookie_secure,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(time_logs.router)
app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(invoices.router)
app.include_router(finance.router)
app.include_router(pricing.router)
app.include_router(admin_tasks.router)
app.include_router(project_milestones.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "environment": settings.environment}
