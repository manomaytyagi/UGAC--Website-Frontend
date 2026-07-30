import uuid
from datetime import datetime, timezone

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
from app.models.events import Event
from app.schemas.event import EventCreate, EventRead, EventUpdate

LIST_INVALIDATE = "events:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_all(
    db: AsyncSession,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
    upcoming_only: bool = False,
    is_featured: bool | None = None,
) -> list[Event] | list[EventRead]:
    key = make_list_key(
        "events",
        skip=skip,
        limit=limit,
        upcoming_only=upcoming_only,
        is_featured=is_featured,
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [EventRead(**item) for item in cached]

    query = select(Event).where(Event.is_active == True)
    if upcoming_only:
        query = query.where(Event.event_date >= datetime.now(tz=timezone.utc))
    if is_featured is not None:
        query = query.where(Event.is_featured == is_featured)
    query = query.order_by(Event.event_date.asc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = list(result.scalars().all())

    if redis is not None:
        await cache_set(
            redis,
            key,
            [EventRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_FRESH,
        )
    return items


async def get_by_id(
    db: AsyncSession, event_id: uuid.UUID, redis: Redis | None = None
) -> Event | EventRead | None:
    if redis is not None:
        key = make_item_key("events", str(event_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return EventRead(**cached)
    result = await db.execute(select(Event).where(Event.id == event_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("events", str(event_id)),
            EventRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_FRESH,
        )
    return item


async def get_active_by_banner_key(db: AsyncSession, banner_key: str) -> Event | None:
    result = await db.execute(
        select(Event).where(Event.banner_key == banner_key, Event.is_active == True)
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: EventCreate, redis: Redis | None = None) -> Event:
    event = Event(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await _invalidate_cache(redis)
    return event


async def update(
    db: AsyncSession, event_id: uuid.UUID, data: EventUpdate, redis: Redis | None = None
) -> Event | None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    if redis is not None:
        await redis.delete(make_item_key("events", str(event_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return event


async def delete(db: AsyncSession, event_id: uuid.UUID, redis: Redis | None = None) -> bool:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        return False
    await db.delete(event)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("events", str(event_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return True