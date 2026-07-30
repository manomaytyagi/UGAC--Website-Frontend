import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import (
    TTL_CATALOG,
    cache_get,
    cache_invalidate,
    cache_set,
    make_item_key,
    make_list_key,
)
from app.models.resources import Resource
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate

LIST_INVALIDATE = "resources:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_resource(
    db: AsyncSession, resource_id: uuid.UUID, redis: Redis | None = None
) -> Resource | ResourceRead | None:
    if redis is not None:
        key = make_item_key("resources", str(resource_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return ResourceRead(**cached)
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("resources", str(resource_id)),
            ResourceRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_CATALOG,
        )
    return item


async def get_active_resource_by_file_url(db: AsyncSession, file_url: str) -> Resource | None:
    result = await db.execute(
        select(Resource).where(Resource.file_url == file_url, Resource.is_active == True)
    )
    return result.scalar_one_or_none()


async def get_resources(
    db: AsyncSession, redis: Redis | None = None, skip: int = 0, limit: int = 100
) -> list[Resource] | list[ResourceRead]:
    key = make_list_key("resources", skip=skip, limit=limit)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [ResourceRead(**item) for item in cached]
    result = await db.execute(
        select(Resource).offset(skip).limit(limit).order_by(Resource.category, Resource.title)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [ResourceRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def get_resources_by_category(
    db: AsyncSession,
    category: str,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Resource] | list[ResourceRead]:
    key = make_list_key(
        "resources", category=category, skip=skip, limit=limit
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [ResourceRead(**item) for item in cached]
    result = await db.execute(
        select(Resource)
        .where(Resource.category == category)
        .order_by(Resource.title)
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [ResourceRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def create_resource(
    db: AsyncSession, data: ResourceCreate, redis: Redis | None = None
) -> Resource:
    item = Resource(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await _invalidate_cache(redis)
    return item


async def update_resource(
    db: AsyncSession, resource_id: uuid.UUID, data: ResourceUpdate, redis: Redis | None = None
) -> Resource | None:
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if item is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    if redis is not None:
        await redis.delete(make_item_key("resources", str(resource_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return item


async def delete_resource(
    db: AsyncSession, resource_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if item is None:
        return False
    await db.delete(item)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("resources", str(resource_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return True