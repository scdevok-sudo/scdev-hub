# SCdev Hub

Dashboard interno del equipo de SCdev. Reemplaza la planilla de seguimiento de
horas y suma gestión de tareas tipo Kanban. Acceso restringido por Google OAuth
a los emails cargados en la tabla `users`.

No es un producto público: no hay registro, ni login por password, ni SEO.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind v4 |
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 (authlib) → JWT en cookie HttpOnly |
| Estado cliente | Zustand |
| Drag & drop | @dnd-kit/core |
| Deploy | Backend en Railway · Frontend en Vercel |

---

## Puesta en marcha

### 1. Base de datos

Ejecutar `backend/migrations/001_initial.sql` en el SQL editor de Supabase.

> Antes de correrlo, reemplazar los emails placeholder (`*@ejemplo.com`) por los
> reales del equipo. Un email que no esté en esa tabla no puede entrar: el
> callback de OAuth lo rechaza con `?error=not_allowed`.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # completar con los valores reales
uvicorn app.main:app --reload --port 8000
```

Docs interactivas en http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_URL=http://localhost:8000
npm run dev                      # http://localhost:5173
```

### 4. Google OAuth

En console.cloud.google.com → Credentials → OAuth 2.0 Client ID (Web):

- **Authorized redirect URI**: `http://localhost:8000/auth/google/callback`
- En producción, agregar la URI de Railway.

Copiar client id y secret a `backend/.env`.

---

## Estructura

```
backend/
  app/
    routers/    auth, projects, tasks, time_logs, dashboard, users
    models/     SQLAlchemy ORM
    schemas/    Pydantic request/response
    auth/       google.py (OAuth flow), jwt.py (crear/verificar)
    core/       config, database, deps, payouts
  migrations/   001_initial.sql
  main.py       shim → app.main:app

frontend/src/
  components/   ui/ · kanban/ · layout/ · forms/
  pages/        Login, Dashboard, Projects, ProjectDetail, MyHours, Admin
  stores/       authStore (Zustand)
  hooks/        useCurrentUser, useProjects, useTasks, useTimeLogs, ...
  lib/          api.ts (fetch wrapper), utils.ts
  types/        index.ts
```

---

## Reglas de negocio

Todas viven en el backend. El frontend nunca las recalcula.

1. **Horas**: mínimo 0.25 (15 min), pasos de 0.25, máximo 24 por registro.
2. **Edición de logs**: solo el mismo día que se cargaron. Pasado el día, solo
   un admin puede editar o borrar. El campo `editable` de cada log dice si el
   usuario actual puede tocarlo.
3. **Reparto**:
   ```
   distributable = billed_amount × (1 − structure_pct)
   payout_user   = (user_hours / total_project_hours) × distributable
   ```
   `structure_pct` se lee siempre del proyecto (default 0.25). Nunca hardcodeado.
4. **Admin** puede: crear/editar proyectos, ver logs de todos, editar logs
   ajenos, actualizar `billed_amount`, entrar a `/admin`.
5. **Collaborator** ve solo sus propios logs y los proyectos activos donde
   participa — definido como: tiene tareas asignadas o horas cargadas ahí.
   Cargar horas en un proyecto activo es lo que lo vuelve participante.
6. El tab **Reparto** aparece solo si `billed_amount > 0`.

---

## API

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/auth/google/login` | Redirige a Google |
| GET | `/auth/google/callback` | Setea cookie JWT, vuelve al frontend |
| POST | `/auth/logout` | Borra la cookie |
| GET | `/auth/me` | Usuario actual o 401 |
| GET | `/users` | Equipo (para selects de asignación) |
| GET | `/admin/users` | Equipo + horas del mes (admin) |
| GET/POST | `/projects` | POST solo admin |
| GET/PATCH | `/projects/{id}` | PATCH solo admin |
| GET | `/projects/{id}/summary` | Reparto económico |
| GET/POST | `/projects/{id}/tasks` | |
| PATCH/DELETE | `/tasks/{id}` | DELETE solo admin o creador |
| GET/POST | `/tasks/{id}/comments` | |
| GET/POST | `/time-logs` | GET = logs propios (`project_id`, `month`, `year`) |
| GET | `/projects/{id}/time-logs` | Admin ve todos, collab los suyos |
| PATCH/DELETE | `/time-logs/{id}` | Regla del mismo día |
| GET | `/dashboard` | Métricas del usuario actual |

---

## Verificaciones

```bash
# Frontend
cd frontend && npx tsc --noEmit && npm run build

# Backend
cd backend && uvicorn app.main:app --reload
curl http://localhost:8000/health
```

---

## Identidad visual

Definida como tokens de Tailwind v4 en `frontend/src/index.css` (`@theme`).

| Token | Valor | Uso |
| --- | --- | --- |
| `onix` | `#121212` | Fondo principal |
| `graphite` | `#1E1E1E` | Superficie de cards |
| `graphite2` | `#2D2D2D` | Inputs, elementos secundarios |
| `line` | `#333333` | Bordes |
| `red` | `#D32F2F` | Acento (Tomato Jam SCdev) |
| `red-dark` | `#B71C1C` | Hover del acento |
| `red-dim` | `rgba(211,47,47,.12)` | Fondos suaves del acento |
| `txt` / `txt2` / `txt3` | `#F5F5F5` / `#9E9E9E` / `#616161` | Jerarquía de texto |

Tipografía: `Varela Round` para headings y logo, `Inter` para body y UI.
