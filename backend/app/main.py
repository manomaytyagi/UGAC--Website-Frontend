import logging
import os
from contextlib import asynccontextmanager

from asyncpg.exceptions import CheckViolationError, ForeignKeyViolationError, UniqueViolationError
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError
from starlette.middleware.sessions import SessionMiddleware

from app.admin import (
    AnnouncementAdmin,
    BranchAdmin,
    CourseAdmin,
    CourseReviewAdmin,
    CurriculumCourseAdmin,
    CurriculumAdmin,
    DepartmentAdmin,
    ElectiveBasketAdmin,
    EventAdmin,
    FacultyAdmin,
    PrerequisiteAdmin,
    ResourceAdmin,
    TeamMemberAdmin,
)
from app.admin._string_url_file_admin import StringUrlFileAdmin
from app.api.v1 import api_router, register_routers
from app.config import settings
from app.core.admin_auth import AdminAuth
from app.core.api_auth import write_guard
from app.core.middleware import RequestLoggingMiddleware
from app.core.rate_limit import limiter
from app.core.storage import _s3_client
from app.database import close_redis, engine, init_redis, sync_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ugac")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    await _ensure_storage_bucket()
    yield
    await close_redis()


app = FastAPI(
    title="UGAC API",
    description="UG Academic Council — IIT Mandi",
    version="0.1.0",
    lifespan=lifespan,
)

# Middleware order (request entry path):
#   RequestLoggingMiddleware → slowapi rate limiter → GZipMiddleware → CORS validation
# FastAPI adds middleware LIFO — last added runs first on request.
# So we add innermost first:
#   1. CORSMiddleware (innermost, closest to handler)
#   2. GZipMiddleware
#   3. slowapi (app.state, conceptually here)
#   4. RequestLoggingMiddleware (outermost, runs first)

app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

auth_backend = AdminAuth(secret_key=settings.SECRET_KEY)
admin = StringUrlFileAdmin(app, sync_engine, authentication_backend=auth_backend)
admin.add_model_view(AnnouncementAdmin)
admin.add_model_view(BranchAdmin)
admin.add_model_view(CourseAdmin)
admin.add_model_view(CurriculumCourseAdmin)
admin.add_model_view(CurriculumAdmin)
admin.add_model_view(DepartmentAdmin)
admin.add_model_view(ElectiveBasketAdmin)
admin.add_model_view(EventAdmin)
admin.add_model_view(FacultyAdmin)
admin.add_model_view(PrerequisiteAdmin)
admin.add_model_view(ResourceAdmin)
admin.add_model_view(CourseReviewAdmin)
admin.add_model_view(TeamMemberAdmin)
register_routers()
app.include_router(api_router, dependencies=[Depends(write_guard)])


async def _ensure_storage_bucket():
    if settings.STORAGE_ENDPOINT == "local":
        os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
        logger.info("Using local storage: %s", settings.LOCAL_STORAGE_PATH)
        return
    try:
        async with _s3_client() as s3:
            await s3.create_bucket(
                Bucket=settings.STORAGE_BUCKET,
                CreateBucketConfiguration={"LocationConstraint": settings.AWS_REGION},
            )
            logger.info("Created S3 bucket: %s", settings.STORAGE_BUCKET)
    except Exception as e:
        code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
        if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists") or "BucketAlreadyOwnedByYou" in str(e):
            logger.info("S3 bucket already exists: %s", settings.STORAGE_BUCKET)
        else:
            logger.warning("Could not create S3 bucket (may be unavailable): %s", e)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    orig = exc.orig
    if isinstance(orig, CheckViolationError):
        detail = "Invalid value for a constrained field. Please check the allowed values."
    elif isinstance(orig, UniqueViolationError):
        detail = "A record with this value already exists."
    elif isinstance(orig, ForeignKeyViolationError):
        detail = "Referenced record not found."
    else:
        detail = "Data integrity error. Please check your input."
    logger.warning("IntegrityError: %s", exc)
    return JSONResponse(status_code=400, content={"detail": detail})


@app.get("/")
async def root():
    return {
        "name": "UGAC API",
        "version": "0.1.0",
        "docs": "/docs",
        "admin": "/admin",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
