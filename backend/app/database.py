from typing import AsyncGenerator, Optional

from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=5, max_overflow=10)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ── Redis client (module-level singleton) ───────────────────────────────────
# Created once at app startup via init_redis(), closed on shutdown.
# Yields None when REDIS_URL is empty so local dev works without Redis.

_redis_client: Optional[aioredis.Redis] = None


def _build_redis_client() -> Optional[aioredis.Redis]:
    if not settings.REDIS_URL:
        return None
    url = settings.REDIS_URL
    kwargs: dict = {"decode_responses": True}
    if url.startswith("https://"):
        url = url.replace("https://", "rediss://")
        if settings.REDIS_TOKEN:
            kwargs["password"] = settings.REDIS_TOKEN
            kwargs["ssl_cert_reqs"] = None
    return aioredis.from_url(url, **kwargs)


async def init_redis() -> None:
    """Create the module-level Redis client. Safe to call when REDIS_URL is empty."""
    global _redis_client
    _redis_client = _build_redis_client()
    if _redis_client is not None:
        try:
            await _redis_client.ping()
        except Exception:
            # Don't crash startup if Redis is temporarily unavailable.
            # Endpoints will degrade gracefully to DB-only via the redis=None checks.
            import logging

            logging.getLogger("ugac.database").warning(
                "Redis ping failed at startup; running without cache"
            )
            try:
                await _redis_client.aclose()
            finally:
                _redis_client = None


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


async def get_redis() -> AsyncGenerator[Optional[aioredis.Redis], None]:
    yield _redis_client