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
from app.models.faculty import Faculty
from app.schemas.faculty import FacultyCreate, FacultyRead, FacultyUpdate

LIST_INVALIDATE = "faculty:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_faculty(
    db: AsyncSession, faculty_id: uuid.UUID, redis: Redis | None = None
) -> Faculty | FacultyRead | None:
    if redis is not None:
        key = make_item_key("faculty", str(faculty_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return FacultyRead(**cached)
    result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("faculty", str(faculty_id)),
            FacultyRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_CATALOG,
        )
    return item


async def get_faculty_by_email(db: AsyncSession, email: str) -> Faculty | None:
    result = await db.execute(select(Faculty).where(Faculty.email == email))
    return result.scalar_one_or_none()


async def get_faculty_list(
    db: AsyncSession, redis: Redis | None = None, skip: int = 0, limit: int = 100
) -> list[Faculty] | list[FacultyRead]:
    key = make_list_key("faculty", skip=skip, limit=limit)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [FacultyRead(**item) for item in cached]
    result = await db.execute(
        select(Faculty).offset(skip).limit(limit).order_by(Faculty.name)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [FacultyRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def get_faculty_by_department(
    db: AsyncSession,
    department_id: uuid.UUID,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Faculty] | list[FacultyRead]:
    key = make_list_key(
        "faculty", department_id=str(department_id), skip=skip, limit=limit
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [FacultyRead(**item) for item in cached]
    result = await db.execute(
        select(Faculty)
        .where(Faculty.department_id == department_id)
        .order_by(Faculty.name)
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [FacultyRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def create_faculty(db: AsyncSession, data: FacultyCreate, redis: Redis | None = None) -> Faculty:
    item = Faculty(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await _invalidate_cache(redis)
    from app.core.cache import bump_namespace
    await bump_namespace(redis, "search")
    return item


async def update_faculty(
    db: AsyncSession, faculty_id: uuid.UUID, data: FacultyUpdate, redis: Redis | None = None
) -> Faculty | None:
    result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))
    item = result.scalar_one_or_none()
    if item is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    if redis is not None:
        await redis.delete(make_item_key("faculty", str(faculty_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return item


async def delete_faculty(
    db: AsyncSession, faculty_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))
    item = result.scalar_one_or_none()
    if item is None:
        return False
    await db.delete(item)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("faculty", str(faculty_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return True