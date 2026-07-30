import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import (
    TTL_REFERENCE,
    cache_get,
    cache_invalidate,
    cache_set,
    make_item_key,
    make_list_key,
)
from app.models.departments import Department
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate

LIST_INVALIDATE = "departments:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_department(
    db: AsyncSession, department_id: uuid.UUID, redis: Redis | None = None
) -> Department | DepartmentRead | None:
    if redis is not None:
        key = make_item_key("departments", str(department_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return DepartmentRead(**cached)
    result = await db.execute(select(Department).where(Department.id == department_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("departments", str(department_id)),
            DepartmentRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_REFERENCE,
        )
    return item


async def get_department_by_code(db: AsyncSession, code: str) -> Department | None:
    result = await db.execute(select(Department).where(Department.code == code))
    return result.scalar_one_or_none()


async def get_departments(
    db: AsyncSession, redis: Redis | None = None, skip: int = 0, limit: int = 100
) -> list[Department] | list[DepartmentRead]:
    key = make_list_key("departments", skip=skip, limit=limit)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [DepartmentRead(**item) for item in cached]
    result = await db.execute(
        select(Department).offset(skip).limit(limit).order_by(Department.code)
    )
    depts = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [DepartmentRead.model_validate(d).model_dump(mode="json") for d in depts],
            ttl=TTL_REFERENCE,
        )
    return depts


async def create_department(db: AsyncSession, data: DepartmentCreate, redis: Redis | None = None) -> Department:
    dept = Department(**data.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    await _invalidate_cache(redis)
    from app.core.cache import bump_namespace
    await bump_namespace(redis, "search")
    return dept


async def update_department(
    db: AsyncSession, department_id: uuid.UUID, data: DepartmentUpdate, redis: Redis | None = None
) -> Department | None:
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)
    await db.commit()
    await db.refresh(dept)
    if redis is not None:
        await redis.delete(make_item_key("departments", str(department_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return dept


async def delete_department(
    db: AsyncSession, department_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        return False
    await db.delete(dept)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("departments", str(department_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return True