import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import (
    TTL_FRESH,
    cache_get,
    cache_invalidate,
    cache_set,
    make_item_key,
    make_list_key,
)
from app.models.announcements import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate

LIST_INVALIDATE = "announcements:list:*"
ITEM_PREFIX = "announcements:item:"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_announcement(
    db: AsyncSession, announcement_id: uuid.UUID, redis: Redis | None = None
) -> Announcement | None:
    """Single-item read with cache-aside."""
    if redis is not None:
        key = make_item_key("announcements", str(announcement_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return AnnouncementRead(**cached)
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("announcements", str(announcement_id)),
            AnnouncementRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_FRESH,
        )
    return item


async def get_announcements(
    db: AsyncSession, redis: Redis | None = None, skip: int = 0, limit: int = 100
) -> list[Announcement] | list[AnnouncementRead]:
    key = make_list_key("announcements", skip=skip, limit=limit)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [AnnouncementRead(**item) for item in cached]
    result = await db.execute(
        select(Announcement).offset(skip).limit(limit).order_by(Announcement.published_at.desc())
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [AnnouncementRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_FRESH,
        )
    return items


async def get_announcements_by_category(
    db: AsyncSession,
    category: str,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Announcement] | list[AnnouncementRead]:
    key = make_list_key(
        "announcements", category=category, skip=skip, limit=limit, variant="category"
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [AnnouncementRead(**item) for item in cached]
    result = await db.execute(
        select(Announcement)
        .where(Announcement.category == category)
        .order_by(Announcement.published_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [AnnouncementRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_FRESH,
        )
    return items


async def get_pinned_announcements(
    db: AsyncSession,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Announcement] | list[AnnouncementRead]:
    key = make_list_key("announcements", skip=skip, limit=limit, variant="pinned")
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [AnnouncementRead(**item) for item in cached]
    result = await db.execute(
        select(Announcement)
        .where(Announcement.is_pinned == True, Announcement.is_active == True)
        .order_by(Announcement.published_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [AnnouncementRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_FRESH,
        )
    return items


async def create_announcement(
    db: AsyncSession, data: AnnouncementCreate, redis: Redis | None = None
) -> Announcement:
    item = Announcement(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await _invalidate_cache(redis)
    from app.core.cache import bump_namespace
    await bump_namespace(redis, "search")
    return item


async def update_announcement(
    db: AsyncSession, announcement_id: uuid.UUID, data: AnnouncementUpdate, redis: Redis | None = None
) -> Announcement | None:
    # Mutations must bypass the cache: a cache hit is an AnnouncementRead
    # response model, while SQLAlchemy needs the mapped Announcement instance.
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    item = result.scalar_one_or_none()
    if item is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    # Evict the cached item (its payload changed) plus list variants.
    if redis is not None:
        await redis.delete(make_item_key("announcements", str(announcement_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return item


async def delete_announcement(
    db: AsyncSession, announcement_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    # See update_announcement: never pass a cached response model to db.delete().
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    item = result.scalar_one_or_none()
    if item is None:
        return False
    await db.delete(item)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("announcements", str(announcement_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return True
