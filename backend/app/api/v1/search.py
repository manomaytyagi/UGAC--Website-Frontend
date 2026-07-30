import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import (
    TTL_SEARCH,
    bump_namespace,
    cache_get,
    cache_set,
    get_namespace_version,
)
from app.database import get_db, get_redis
from app.models.announcements import Announcement
from app.models.branches import Branch
from app.models.courses import Course
from app.models.departments import Department
from app.models.faculty import Faculty

router = APIRouter()


class SearchResult(BaseModel):
    type: str
    id: uuid.UUID
    title: str
    subtitle: str | None = None


SEARCHABLE = [
    ("course", Course, [Course.code, Course.name], "code", "name"),
    ("department", Department, [Department.code, Department.name], "code", "name"),
    ("branch", Branch, [Branch.code, Branch.name], "code", "name"),
    ("faculty", Faculty, [Faculty.name, Faculty.email, Faculty.designation], "name", "email"),
    ("announcement", Announcement, [Announcement.title], "title", "category"),
]

SEARCH_NAMESPACE = "search"


async def _bump_search_version(redis: Redis | None) -> None:
    """Invalidate all search caches by bumping a version counter.

    Cheaper than scanning all search:* keys: every cached key embeds the
    current version, so old entries are simply never read again.
    """
    await bump_namespace(redis, SEARCH_NAMESPACE)


@router.get("/", response_model=list[SearchResult])
async def search(
    q: str = Query(min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache_key = None
    if redis is not None:
        version = await get_namespace_version(redis, SEARCH_NAMESPACE)
        cache_key = f"search:v{version}:q={q.lower()}:limit={limit}"
        cached = await cache_get(redis, cache_key)
        if cached is not None:
            return [SearchResult(**item) for item in cached]

    results: list[SearchResult] = []

    for type_name, model, columns, title_col, subtitle_col in SEARCHABLE:
        remaining = limit - len(results)
        if remaining <= 0:
            break
        filters = [col.ilike(f"%{q}%") for col in columns]
        stmt = select(model).where(or_(*filters)).limit(remaining).order_by(columns[0])
        rows = (await db.execute(stmt)).scalars().all()
        for r in rows:
            results.append(
                SearchResult(
                    type=type_name,
                    id=r.id,
                    title=getattr(r, title_col),
                    subtitle=getattr(r, subtitle_col, None),
                )
            )

    if redis is not None and cache_key is not None:
        await cache_set(
            redis,
            cache_key,
            [r.model_dump(mode="json") for r in results],
            ttl=TTL_SEARCH,
            namespace=SEARCH_NAMESPACE,
        )

    return results