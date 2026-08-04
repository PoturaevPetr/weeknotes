# Weeknotes

Shared boards for notes with likes, done status, optional geolocation, and live WebSocket sync.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, JWT
- **Frontend:** Next.js (App Router), TypeScript, Leaflet
- **Realtime:** WebSockets
- **Infra:** Docker Compose (Postgres + API + Web)

## Quick start (Docker)

```bash
cp .env.example .env   # set ports + API URL if needed
docker compose up --build
```

| Service | Default URL |
|---------|-------------|
| App | http://localhost:3000 (`WEB_PORT`) |
| API / docs | http://localhost:8000/docs (`API_PORT`) |
| Postgres | `localhost:5433` (user/pass/db: `notes`) |

Migrations run automatically when the API container starts.

Stop:

```bash
docker compose down
```

Reset DB volume:

```bash
docker compose down -v
```

## Environment

Copy `.env.example` → `.env` in the repo root (Compose reads it automatically).

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `8000` | Host port published for the API container |
| `WEB_PORT` | `3000` | Host port published for the web container |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API base URL used by the browser |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | WebSocket base URL used by the browser |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed browser origins (usually the web URL) |
| `SECRET_KEY` | (dev key) | JWT signing secret |
| `DATABASE_URL` | compose: `@db:5432`, local: `@localhost:5433` | Async SQLAlchemy URL (backend `.env`) |

If you change `API_PORT` / `WEB_PORT`, update `NEXT_PUBLIC_*` and `CORS_ORIGINS` to match, then **rebuild** the web image (`NEXT_PUBLIC_*` are baked in at build time):

```bash
docker compose up --build
```

## Local development (without Docker for app)

```bash
docker compose up -d db

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

For local backend, `DATABASE_URL` uses host port **5433**.

## Features (MVP)

- Register / login (JWT)
- Create boards, join via invite code
- Notes with author + created_at
- Like / unlike, mark done
- Optional lat/lng + Leaflet map
- Live updates over WebSocket
