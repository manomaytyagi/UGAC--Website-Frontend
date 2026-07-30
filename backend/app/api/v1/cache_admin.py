from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.cache import cache_stats
from app.database import get_redis
from app.config import settings
from app.core.security import verify_password
import base64
import binascii
import secrets

router = APIRouter()


async def admin_guard(request: Request) -> None:
    """Require HTTP Basic auth with admin credentials for debug endpoints."""
    header = request.headers.get("Authorization", "")
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin credentials required for this operation",
        headers={"WWW-Authenticate": "Basic"},
    )
    if not header.startswith("Basic "):
        raise unauthorized
    try:
        username, _, password = base64.b64decode(header[6:]).decode("utf-8").partition(":")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        raise unauthorized

    ok_user = secrets.compare_digest(username, settings.ADMIN_USERNAME)
    ok_pass = verify_password(password, settings.ADMIN_PASSWORD_HASH)
    if not (ok_user and ok_pass):
        raise unauthorized


@router.get("/cache-stats", tags=["Debug"], dependencies=[Depends(admin_guard)])
async def get_cache_stats(redis: Redis = Depends(get_redis)):
    """Snapshot of cache hit/miss/error counters across all cached namespaces.

    Useful for verifying the cache is actually being hit in production.
    """
    return await cache_stats(redis)