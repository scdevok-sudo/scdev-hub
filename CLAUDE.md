# Instrucciones para Claude Code — SCdev Hub

Pegá este archivo como `CLAUDE.md` en la raíz del proyecto antes de arrancar.
Claude Code lo lee automáticamente al abrir la carpeta.

---

## Qué es este proyecto

SCdev Hub es un dashboard web interno para el equipo de SCdev (4 personas).
Reemplaza una planilla Excel de seguimiento de horas y agrega gestión de tareas
tipo Kanban. Acceso restringido vía Google OAuth — solo los 4 emails del equipo.

No es un producto público. No tiene página de registro ni SEO.

---

## Decisiones ya tomadas — no preguntar, ejecutar

### Stack (no negociable)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python 3.12+)
- **Base de datos**: Supabase (PostgreSQL) — ya tenemos cuenta
- **Auth**: Google OAuth 2.0 via `authlib` en el backend. JWT en localStorage,
  enviado en `Authorization: Bearer`. (El brief original decia cookie HttpOnly;
  se cambio porque en Vercel serverless el front y el back quedan cross-site y
  la cookie no sobrevive. No volver a cookies sin revisar eso.)
- **Estado cliente**: Zustand
- **Drag & drop Kanban**: `@dnd-kit/core` — no usar react-beautiful-dnd (abandonada)
- **Iconos**: lucide-react
- **Deploy**: backend en Railway, frontend en Vercel

### Identidad visual (aplicar sin preguntar)
```
--onix:      #121212   ← fondo principal
--graphite:  #1E1E1E   ← superficie de cards
--graphite2: #2D2D2D   ← inputs, elementos secundarios
--border:    #333333
--red:       #D32F2F   ← acento principal (Tomato Jam SCdev)
--red-dark:  #B71C1C
--red-dim:   rgba(211,47,47,0.12)
--text:      #F5F5F5
--text-2:    #9E9E9E
--text-3:    #616161
```
Tipografía: `Varela Round` (Google Fonts) para headings y logo.
`Inter` para body y UI.

### Estructura de carpetas (crear exactamente así)
```
scdev-hub/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          ← componentes base (Button, Badge, Avatar, Modal)
│   │   │   ├── kanban/      ← KanbanBoard, TaskCard, TaskDrawer
│   │   │   ├── layout/      ← Sidebar, Header, PageWrapper
│   │   │   └── forms/       ← TimeLogForm, TaskForm
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── MyHours.tsx
│   │   │   └── Admin.tsx
│   │   ├── stores/          ← Zustand stores
│   │   ├── hooks/           ← useCurrentUser, useProjects, useTasks, etc.
│   │   ├── lib/
│   │   │   ├── api.ts       ← fetch wrapper con base URL y auth header
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts     ← todos los tipos TypeScript
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── time_logs.py
│   │   │   └── dashboard.py
│   │   ├── models/          ← SQLAlchemy ORM models
│   │   ├── schemas/         ← Pydantic schemas (request/response)
│   │   ├── auth/
│   │   │   ├── google.py    ← OAuth flow
│   │   │   └── jwt.py       ← crear/verificar JWT
│   │   └── core/
│   │       ├── config.py    ← Settings con pydantic-settings
│   │       ├── database.py  ← engine, SessionLocal, get_db
│   │       └── deps.py      ← get_current_user dependency
│   ├── migrations/
│   │   └── 001_initial.sql  ← schema completo para ejecutar en Supabase
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Base de datos — schema completo

Crear el archivo `backend/migrations/001_initial.sql` con exactamente este contenido:

```sql
-- Habilitar extensión para UUIDs
create extension if not exists "pgcrypto";

-- USERS
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null,
  avatar_url  text,
  google_id   text unique,
  role        text not null default 'collaborator' check (role in ('admin', 'collaborator')),
  created_at  timestamptz default now()
);

-- Insertar los 4 miembros del equipo (google_id se completa en el primer login)
-- REEMPLAZAR los emails con los reales antes de ejecutar
insert into users (email, name, role) values
  ('santi@ejemplo.com',    'Santi Cáceres',     'admin'),
  ('lucas@ejemplo.com',    'Lucas Fernández',   'collaborator'),
  ('ezequiel@ejemplo.com', 'Ezequiel Weber',    'collaborator'),
  ('agustin@ejemplo.com',  'Agustín Mazzoni',  'collaborator')
on conflict (email) do nothing;

-- PROJECTS
create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  client_name     text not null,
  description     text,
  status          text not null default 'active' check (status in ('active', 'paused', 'completed')),
  structure_pct   numeric(5,4) not null default 0.25,
  billed_amount   numeric(12,2) default 0,
  estimated_hours numeric(8,2),
  created_by      uuid references users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- TASKS
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to  uuid references users(id),
  created_by   uuid references users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- TASK COMMENTS
create table if not exists task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks(id) on delete cascade,
  user_id    uuid references users(id),
  content    text not null,
  created_at timestamptz default now()
);

-- TIME LOGS
create table if not exists time_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  user_id     uuid references users(id),
  task_id     uuid references tasks(id),
  description text not null,
  hours       numeric(5,2) not null check (hours >= 0.25 and hours <= 24),
  logged_date date not null default current_date,
  created_at  timestamptz default now()
);

-- Índices para queries frecuentes
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_assigned on tasks(assigned_to);
create index if not exists idx_time_logs_project on time_logs(project_id);
create index if not exists idx_time_logs_user on time_logs(user_id);
create index if not exists idx_time_logs_date on time_logs(logged_date);
```

---

## Variables de entorno

### backend/.env.example
```env
# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# JWT
JWT_SECRET=cambiame-por-un-string-largo-random
JWT_EXPIRE_HOURS=168

# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# App
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

### frontend/.env.example
```env
VITE_API_URL=http://localhost:8000
```

---

## API — endpoints completos

### Auth
```
GET  /auth/google/login      → redirige a Google OAuth
GET  /auth/google/callback   → procesa code, redirige a FRONTEND_URL/auth/callback?token=<JWT>
POST /auth/logout            → no-op, el cliente borra el token de localStorage
GET  /auth/me                → devuelve usuario actual o 401
```

### Projects
```
GET    /projects                → lista proyectos (todos si admin, activos asignados si collaborator)
POST   /projects                → crear proyecto (solo admin)
GET    /projects/{id}           → detalle
PATCH  /projects/{id}           → editar (solo admin)
GET    /projects/{id}/summary   → resumen económico: horas y $ por persona
```

### Tasks
```
GET    /projects/{id}/tasks     → tasks del proyecto con assignee y status
POST   /projects/{id}/tasks     → crear task
PATCH  /tasks/{id}              → editar task (title, description, status, assigned_to, priority)
DELETE /tasks/{id}              → borrar (solo admin o creator)
GET    /tasks/{id}/comments     → comentarios
POST   /tasks/{id}/comments     → agregar comentario
```

### Time logs
```
GET    /time-logs               → logs del usuario actual (query params: project_id, month, year)
GET    /projects/{id}/time-logs → todos los logs del proyecto (admin ve todos, collab ve los suyos)
POST   /time-logs               → cargar horas
PATCH  /time-logs/{id}          → editar (solo owner y solo si logged_date = hoy, o admin)
DELETE /time-logs/{id}          → borrar (misma restricción)
```

### Dashboard
```
GET /dashboard → métricas del usuario actual:
                 { hours_this_month, estimated_payout, active_projects, pending_tasks }
```

---

## Reglas de negocio (implementar en backend, no en frontend)

```
1. Horas mínimas: 0.25 (15 min). Steps de 0.25. Máximo 24 por log.
2. Logs editables: solo el mismo día. Pasado el día → solo admin puede editar.
3. Fórmula de reparto:
   - distributable = billed_amount × (1 - structure_pct)
   - payout_user   = (user_hours / total_project_hours) × distributable
4. structure_pct default: 0.25 (25% para SCdev). Configurable por proyecto.
5. Solo admin puede:
   - Crear/editar/archivar proyectos
   - Ver logs de todos los usuarios
   - Editar logs ajenos
   - Actualizar billed_amount
   - Acceder a /admin
6. Collaborator solo ve sus propios logs y sus proyectos asignados.
```

---

## Componentes UI a construir (en orden)

### Bloque 1 — Base y auth
```
components/ui/Button.tsx       → variantes: primary (rojo), ghost, outline
components/ui/Badge.tsx        → status de task y proyecto con colores
components/ui/Avatar.tsx       → circular, con initials fallback si no hay foto
components/ui/Modal.tsx        → overlay oscuro, contenido centrado, cierre con Escape
components/layout/Sidebar.tsx  → navegación lateral fija, logo SCdev, links de páginas
components/layout/Header.tsx   → breadcrumb + avatar del usuario actual + logout
pages/Login.tsx                → logo centrado, botón "Continuar con Google", fondo Onix
```

### Bloque 2 — Proyectos
```
components/ui/ProjectCard.tsx  → nombre, cliente, status badge, barra de horas si hay estimado
pages/Projects.tsx             → grid de ProjectCards + botón "Nuevo proyecto" (admin)
pages/ProjectDetail.tsx        → tabs: Kanban / Horas / Reparto
```

### Bloque 3 — Kanban
```
components/kanban/KanbanBoard.tsx  → 3 columnas (Todo / En progreso / Listo) con dnd-kit
components/kanban/KanbanColumn.tsx → columna con header, contador de tasks, área de drop
components/kanban/TaskCard.tsx     → título, avatar asignado, badge de prioridad, click → drawer
components/kanban/TaskDrawer.tsx   → panel lateral: detalle completo + comentarios + form de comentario
components/forms/TaskForm.tsx      → modal para crear/editar task
```

### Bloque 4 — Time logs
```
components/forms/TimeLogForm.tsx   → modal: proyecto (select), tarea (select opcional),
                                     fecha (date picker, no futuro), descripción, horas (0.25 steps)
pages/MyHours.tsx                  → selector de mes, tabla de logs, totales: horas y $ estimado
Tab "Horas" en ProjectDetail.tsx   → tabla de logs del proyecto, botón cargar horas
```

### Bloque 5 — Reparto y admin
```
components/PayoutSummary.tsx   → tabla: persona / horas / % / $ calculado. Total facturado y a repartir.
Tab "Reparto" en ProjectDetail → visible solo si billed_amount > 0
pages/Dashboard.tsx            → 4 widgets: horas del mes, $ estimado, proyectos activos, tasks pendientes
                                  + tabla de logs recientes (últimos 7 días)
pages/Admin.tsx                → visible solo si role === 'admin'
                                  lista de usuarios con horas del mes
                                  CRUD de proyectos
                                  campo para cargar billed_amount por proyecto
```

---

## Cuándo DETENERSE y pedir confirmación

Detenerse y mostrar opciones antes de continuar en estos casos:

1. **Diseño del Sidebar**: hay dos opciones posibles (fijo a la izquierda vs colapsable). Mostrar ambas en ASCII y esperar decisión.

2. **Diseño del TaskDrawer**: puede ser panel lateral que empuja el contenido vs overlay encima. Mostrar ambas y esperar decisión.

3. **Diseño de la tabla de reparto**: puede ser tabla clásica vs cards por persona. Mostrar ambas y esperar decisión.

4. **Cualquier decisión de UX no cubierta en este documento**: no asumir, preguntar con las opciones concretas.

En cualquier otro caso (estructura de archivos, lógica de negocio, queries SQL, validaciones): ejecutar directamente lo que dice este documento sin preguntar.

---

## Verificaciones obligatorias por bloque

Al terminar cada bloque, antes del commit:

```bash
# Frontend
cd frontend
npx tsc --noEmit          # debe dar 0 errores
npm run build             # debe compilar sin errores

# Backend
cd backend
uvicorn app.main:app --reload   # debe levantar sin errores
# correr manualmente los endpoints del bloque con curl o httpie
```

Formato de commits:
```
feat(bloque-1): setup, auth Google, login page
feat(bloque-2): proyectos CRUD, pages Projects y ProjectDetail
feat(bloque-3): kanban con dnd-kit, TaskDrawer, comentarios
feat(bloque-4): time logs, MyHours, tab Horas en proyecto
feat(bloque-5): reparto 25/75, dashboard, admin panel
feat(bloque-6): deploy Railway + Vercel, variables de entorno producción
```

---

## Requirements.txt (backend)

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
authlib>=1.3.0
httpx>=0.27.0
python-jose[cryptography]>=3.3.0
pydantic-settings>=2.0.0
python-multipart>=0.0.9
python-dotenv>=1.0.0
```

---

## Package.json (frontend — dependencias clave)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

---

## Cómo arrancar (para el desarrollador)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # completar con los valores reales
uvicorn app.main:app --reload --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env        # completar con VITE_API_URL
npm run dev                 # corre en http://localhost:5173

# Base de datos
# Ejecutar backend/migrations/001_initial.sql en el SQL editor de Supabase
# Reemplazar los emails placeholder con los reales del equipo
```

---

## Lo que NO hacer

- No usar `react-beautiful-dnd` (abandonada). Solo `@dnd-kit/core`.
- No usar `axios`. Usar el fetch wrapper nativo en `lib/api.ts`.
- No usar `next.js`. Es Vite puro.
- No usar `prisma`. SQLAlchemy directo.
- No crear página de registro. El acceso es solo por whitelist de emails.
- No agregar autenticación por email/password. Solo Google OAuth.
- No usar librerías de UI externas (MUI, Chakra, shadcn). Tailwind custom desde cero.
- No hardcodear el 25% de estructura. Leerlo siempre del campo `structure_pct` del proyecto.
- No mostrar el tab "Reparto" si `billed_amount === 0`.
- No permitir que un collaborator vea logs de otros usuarios.
