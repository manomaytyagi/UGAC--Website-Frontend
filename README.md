# UGAC Web — UG Academic Council, IIT Mandi

Backend API for the Undergraduate Academic Council website. Serves course catalogs, curricula, faculty, reviews, announcements/events, team info, and file resources, with a built-in admin panel for content management.

- **Framework:** FastAPI (async)
- **Database:** PostgreSQL (Neon) via async SQLAlchemy 2.0 + asyncpg
- **Cache:** Redis (Upstash)
- **Storage:** AWS S3 (prod) / MinIO (dev) / local FS — pluggable
- **Admin:** SQLAdmin panel at `/admin`
- **Docs:** OpenAPI/Swagger at `/docs`
- **Deploy:** AWS ECS Fargate (Express Mode) behind an auto-provisioned ALB; CI/CD via GitHub Actions

---

## Architecture

```
                              ┌──────────────────────────────┐
                              │   Frontend (Netlify)          │
                              │   ugac-frontend-1.netlify.app │
                              │   ugac.iitmandi.ac.in         │
                              └───────────────┬──────────────┘
                                              │ HTTPS (CORS-restricted)
                                              ▼
                              ┌──────────────────────────────┐
                              │  Application Load Balancer     │
                              │  HTTPS :443, ACM auto-cert     │
                              │  health check → /health        │
                              └───────────────┬──────────────┘
                                              │ :8000
                                              ▼
              ┌────────────────────────────────────────────────────────┐
              │           ECS Fargate — "Main" container                 │
              │           uvicorn → FastAPI (app.main:app)               │
              │                                                          │
              │   Request path (middleware, outer → inner):             │
              │   RequestLogging → RateLimit(slowapi) → GZip → CORS      │
              │                                                          │
              │   ┌───────────────┐      ┌──────────────────────────┐   │
              │   │  root REST      │      │   /admin (SQLAdmin)       │   │
              │   │  REST routers  │      │   session-auth panel      │   │
              │   └──────┬────────┘      └────────┬─────────────┘   │
              │          │                            │                  │
              │     write_guard                  AdminAuth               │
              │          │                            │                  │
              │   ┌──────▼────────────────────────────▼─────────────┐   │
              │   │  CRUD  ·  SQLAlchemy models  ·  Pydantic schemas  │   │
              │   └──────┬───────────────┬──────────────────┬───────┘   │
              └──────────┼───────────────┼──────────────────┼───────────┘
                         │               │                  │
            async engine │   aioredis    │     aioboto3      │
                         ▼               ▼                  ▼
              ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
              │ PostgreSQL   │  │ Redis        │  │ S3 bucket        │
              │ (Neon)       │  │ (Upstash)    │  │ ugac-files       │
              │ async + sync │  │ cache        │  │ file resources   │
              │ for SQLAdmin │  │              │  │                  │
              └──────────────┘  └──────────────┘  └──────────────────┘

   Secrets: AWS Secrets Manager (prefix `ugac/`) → injected as container env vars
   Migrations: Alembic `upgrade head` runs on container start (start.sh)
```

### Layers (`backend/app/`)

| Layer | Path | Role |
|---|---|---|
| Entrypoint | `main.py` | App bootstrap, middleware, admin mount, S3 bucket init |
| Config | `config.py` | Env-driven settings, rejects insecure defaults |
| API routers | `api/v1/*` | REST endpoint modules, mounted at root-level paths |
| Admin views | `admin/*` | SQLAdmin CRUD UI (12 models) |
| Core | `core/*` | auth, deps, cache, storage abstraction, middleware |
| CRUD | `crud/*` | DB query logic |
| Models | `models/*` | SQLAlchemy ORM tables |
| Schemas | `schemas/*` | Pydantic request/response shapes |
| DB | `database.py` | Async engine + session, Redis client factory |

### API surface (root-level)

Live frontend-facing routes are mounted at the service root: `/branches/`, `/departments/`, `/courses/`, `/courses/lite`, `/curricula/`, `/search/`, `/procedures/`, `/reviews/`, `/team/`, `/faculty/`, `/announcements/`, `/events/`, `/resources/`, and `/storage/`.

The backend does not currently mount `/api/v1/...`; if a frontend calls that namespace, it must be rewritten by the frontend bridge/proxy or the backend must explicitly add a compatibility mount.

Read endpoints are public; write endpoints are gated by `write_guard`. The `/admin` panel uses session-based `AdminAuth`. Note: SQLAdmin needs a **synchronous** engine, so `main.py` derives a sync URL (`+asyncpg` stripped, `ssl=`→`sslmode=`) alongside the async one.

Presigned download endpoints return `{ "key": "...", "url": "..." }` only for active content records that own the requested key and whose object exists in storage: `/resources/presigned?key=...` checks `Resource.file_url`; `/events/banner?key=...` checks `Event.banner_key`.

---

## Local development

Prerequisites: Python 3.12, Docker.

```bash
cd backend

# 1. Start Postgres + MinIO
docker compose up -d

# 2. Set up env
cp .env.example .env
# For local dev, set in .env:
#   DATABASE_URL=postgresql+asyncpg://ugac:ugac_dev@localhost:5432/ugac
#   STORAGE_ENDPOINT=http://localhost:9000   (MinIO)  or  local  (local FS)
#   SECRET_KEY=<32+ random chars>            (required — defaults are rejected)
#   ADMIN_PASSWORD=<something>               (required)

# 3. Install deps
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 4. Run migrations
alembic upgrade head

# 5. Start the API
uvicorn app.main:app --reload --port 8000
```

Then:
- API root → http://localhost:8000/
- Swagger → http://localhost:8000/docs
- Admin → http://localhost:8000/admin
- MinIO console → http://localhost:9001 (`minioadmin` / `minioadmin`)

`config.py` **rejects default `SECRET_KEY`/`ADMIN_PASSWORD`**. For throwaway local runs only, set `ALLOW_INSECURE_DEFAULTS=true`.

### Storage modes

| `STORAGE_ENDPOINT` | Mode |
|---|---|
| empty `""` | AWS S3 native (uses IAM/task role or `STORAGE_ACCESS_KEY`/`SECRET_KEY`) |
| `local` | Local filesystem at `LOCAL_STORAGE_PATH` (`./data`) |
| `http://localhost:9000` | MinIO / custom S3-compatible endpoint |

---

## Deployment (AWS)

**Region** `ap-south-1` (Mumbai).

Container runs on **ECS Fargate Express Mode** (256 CPU / 512 MB, autoscale 1→3 on request count), fronted by an auto-provisioned **ALB** (HTTPS, ACM cert), health-checked at `/health`. Image lives in **ECR** (`ugac-backend`). Secrets come from **Secrets Manager** (prefix `ugac/`) injected as env vars. On container start, `start.sh` runs `alembic upgrade head` then launches uvicorn.

External managed services: **Neon** (Postgres), **Upstash** (Redis), **S3** (`ugac-files`).

### CI/CD — GitHub Actions

Workflow: `.github/workflows/deploy-aws.yml`. Triggers on push to `main` touching `backend/**`.

```
push to main (backend/**)
        │
        ▼
OIDC auth → AWS (role: github-actions-deploy, no static keys)
        │
        ▼
docker build → push to ECR  (tag = commit SHA)
        │
        ▼
generate task definition with new image
        │
        ▼
deploy to ECS → canary roll (5% / 3 min → full) → wait for stability
```

**One-time setup:** add repo secret `AWS_DEPLOY_ROLE_ARN` (the `github-actions-deploy` role ARN) under Settings → Secrets and variables → Actions.

### Manual deploy

Replace `<ACCOUNT_ID>`, `<CLUSTER>`, `<SERVICE>` with your real values.

```bash
ECR=<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ugac-backend
docker build -t ugac-backend backend/
docker tag ugac-backend:latest $ECR:latest
docker push $ECR:latest
aws ecs update-service --cluster <CLUSTER> --service <SERVICE> --force-new-deployment
```

### Production env vars

Plain: `PORT=8000`, `STORAGE_ENDPOINT=https://s3.ap-south-1.amazonaws.com`, `STORAGE_BUCKET=ugac-files`, `AWS_REGION=ap-south-1`. (Empty value also routes to S3 native — both persist to S3.)

From Secrets Manager: `DATABASE_URL`, `REDIS_URL`, `REDIS_TOKEN`, `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CORS_ORIGINS`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

### Logs

```bash
aws logs tail <CLOUDWATCH_LOG_GROUP> --follow
```

---

## Repo layout

```
UGAC-Web/
├── backend/
│   ├── app/            # FastAPI application (see Layers table)
│   ├── alembic/        # DB migrations
│   ├── docker-compose.yml   # local Postgres + MinIO
│   ├── Dockerfile
│   ├── start.sh        # migrate + launch
│   └── requirements.txt
└── .github/workflows/
    └── deploy-aws.yml  # CI/CD
```
