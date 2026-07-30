"""Redis caching helpers.

Public API:
- TTL constants (TTL_REFERENCE, TTL_CATALOG, TTL_FRESH, TTL_REVIEW, TTL_SEARCH)
- make_list_key(resource, **filters)
- make_item_key(resource, item_id)
- cache_get(redis, key, namespace=None)
- cache_set(redis, key, value, ttl, namespace=None)
- cache_invalidate(redis, pattern)
- cache_get_or_set(redis, key, factory, ttl, namespace=None)
- bump_namespace(redis, namespace)  -- version-key invalidation
"""

from __future__ import annotations

import json
import logging
from typing import Any, Awaitable, Callable, Optional

from redis.asyncio import Redis

logger = logging.getLogger("ugac.cache")

# Per-resource TTLs (seconds). Tuned by freshness needs.
TTL_REFERENCE = 3600   # departments, branches — rarely change
TTL_CATALOG = 600      # courses, curricula, faculty, resources, team
TTL_FRESH = 120        # announcements, events — freshness matters
TTL_REVIEW = 60        # reviews — user-generated
TTL_SEARCH = 30        # search results — keystroke-friendly


def make_list_key(resource: str, **filters: Any) -> str:
    """Build a deterministic cache key for a list endpoint.

    Example: make_list_key("announcements", skip=0, limit=100, category="general")
    -> "announcements:list:skip=0:limit=100:category=general"
    """
    if not filters:
        return f"{resource}:list"
    parts = [f"{k}={v}" for k, v in sorted(filters.items())]
    return f"{resource}:list:" + ":".join(parts)


def make_item_key(resource: str, item_id: Any) -> str:
    return f"{resource}:item:{item_id}"


def _namespace_from_key(key: str) -> str:
    """Extract a stable namespace from a cache key for hit/miss counters.

    For keys like "announcements:list:skip=0:limit=100" -> namespace "announcements".
    For keys like "announcements:item:<uuid>" -> namespace "announcements".
    """
    return key.split(":", 1)[0]


async def _bump_counter(redis: Redis, name: str, namespace: str) -> None:
    """Increment a counter. Best-effort; failures are swallowed."""
    try:
        await redis.incr(f"cache:{name}:{namespace}")
    except Exception:
        logger.debug("Cache counter increment failed for %s/%s", name, namespace)


async def cache_get(
    redis: Optional[Redis], key: str, namespace: Optional[str] = None
) -> Optional[Any]:
    """Read JSON value from cache. Tracks hit/miss counters."""
    if redis is None:
        return None
    ns = namespace or _namespace_from_key(key)
    try:
        raw = await redis.get(key)
    except Exception:
        logger.exception("cache_get failed for key=%s", key)
        await _bump_counter(redis, "errors", ns)
        return None
    if raw is None:
        await _bump_counter(redis, "misses", ns)
        return None
    await _bump_counter(redis, "hits", ns)
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        logger.warning("cache_get: invalid JSON at key=%s", key)
        return None


async def cache_set(
    redis: Optional[Redis],
    key: str,
    value: Any,
    ttl: int,
    namespace: Optional[str] = None,
) -> None:
    """Write JSON value to cache with TTL."""
    if redis is None:
        return
    try:
        await redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        logger.exception("cache_set failed for key=%s", key)
        ns = namespace or _namespace_from_key(key)
        await _bump_counter(redis, "errors", ns)


async def cache_invalidate(redis: Optional[Redis], pattern: str) -> int:
    """Delete keys matching `pattern`. Uses SCAN to avoid blocking Redis.

    Returns the number of keys deleted. `pattern` may be an exact key or a glob.
    """
    if redis is None:
        return 0
    deleted = 0
    try:
        async for key in redis.scan_iter(match=pattern, count=200):
            await redis.delete(key)
            deleted += 1
    except Exception:
        logger.exception("cache_invalidate failed for pattern=%s", pattern)
    return deleted


async def cache_get_or_set(
    redis: Optional[Redis],
    key: str,
    factory: Callable[[], Awaitable[Any]],
    ttl: int,
    namespace: Optional[str] = None,
) -> Optional[Any]:
    """Return cached value; on miss, call `factory()`, cache its return, return it.

    If `factory` returns None, the value is NOT cached (negative caching avoided).
    """
    if redis is None:
        return await factory()
    cached = await cache_get(redis, key, namespace=namespace)
    if cached is not None:
        return cached
    value = await factory()
    if value is not None:
        await cache_set(redis, key, value, ttl, namespace=namespace)
    return value


async def bump_namespace(redis: Optional[Redis], namespace: str) -> int:
    """Increment a version counter for cheap global invalidation of a namespace.

    Use as: include the version in the cache key (e.g. "search:v{get_version()}:q=foo")
    and bump on writes to evict all matching keys without SCAN.
    """
    if redis is None:
        return 0
    try:
        return int(await redis.incr(f"cache:version:{namespace}"))
    except Exception:
        logger.exception("bump_namespace failed for %s", namespace)
        return 0


async def get_namespace_version(redis: Optional[Redis], namespace: str) -> int:
    """Read the current version counter; 0 if missing or Redis unavailable."""
    if redis is None:
        return 0
    try:
        v = await redis.get(f"cache:version:{namespace}")
        return int(v) if v is not None else 0
    except Exception:
        logger.debug("get_namespace_version failed for %s", namespace)
        return 0


async def cache_stats(redis: Optional[Redis]) -> dict:
    """Snapshot of hit/miss/error counters across all cached namespaces."""
    if redis is None:
        return {"enabled": False}
    out: dict = {"enabled": True, "hits": {}, "misses": {}, "errors": {}}
    for kind in ("hits", "misses", "errors"):
        try:
            async for key in redis.scan_iter(match=f"cache:{kind}:*", count=200):
                ns = key.split(":", 2)[-1]
                v = await redis.get(key)
                out[kind][ns] = int(v) if v else 0
        except Exception:
            logger.exception("cache_stats failed reading %s", kind)
    # hit ratio
    ratios = {}
    for ns, hits in out["hits"].items():
        misses = out["misses"].get(ns, 0)
        total = hits + misses
        ratios[ns] = round(hits / total, 3) if total else 0.0
    out["hit_ratio"] = ratios
    return out