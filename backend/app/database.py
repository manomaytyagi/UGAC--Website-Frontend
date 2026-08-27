from typing import AsyncGenerator, Optional

from redis import asyncio as aioredis
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Shared by both engines below — they contend for the same Neon connection budget,
# so the tuning lives in one place rather than drifting apart in two files.
#
# pool_pre_ping: Neon suspends idle compute and the pooler drops idle server
#   connections, so a pooled connection can be dead by the time we check it out.
#   Without this the first request after an idle period fails instead of
#   transparently reconnecting.
# pool_recycle: discard connections older than 5 min rather than handing out one
#   the far end has already closed.
_POOL_KW = {
    "echo": False,
    "pool_size": 5,
    "max_overflow": 10,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

engine = create_async_engine(settings.DATABASE_URL, **_POOL_KW)


def _sync_url(url: str):
    """Translate the asyncpg URL to its psycopg2 equivalent for sqladmin.

    sqladmin needs a sync engine. Only the driver and the SSL query param differ:
    asyncpg spells it `ssl`, psycopg2 spells it `sslmode`. Parse the URL rather
    than string-replacing — a plain .replace("ssl=", "sslmode=") also rewrites any
    password containing that substring, silently producing a wrong password.
    """
    u = make_url(url).set(drivername="postgresql")
    query = dict(u.query)
    if "ssl" in query:
        query["sslmode"] = query.pop("ssl")
        u = u.set(query=query)
    return u


sync_engine = create_engine(_sync_url(settings.DATABASE_URL), **_POOL_KW)

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


def get_redis_client() -> Optional[aioredis.Redis]:
    """Return the Redis client directly, for callers outside FastAPI's DI.

    sqladmin's model hooks are not dependency-injected, so they cannot use
    get_redis(). Read at call time — the client is None until init_redis() runs.
    """
    return _redis_client