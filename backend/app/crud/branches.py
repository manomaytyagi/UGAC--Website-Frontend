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
from app.models.branches import Branch
from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate

LIST_INVALIDATE = "branches:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_branch(
    db: AsyncSession, branch_id: uuid.UUID, redis: Redis | None = None
) -> Branch | BranchRead | None:
    if redis is not None:
        key = make_item_key("branches", str(branch_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return BranchRead(**cached)
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("branches", str(branch_id)),
            BranchRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_REFERENCE,
        )
    return item


async def get_branch_by_code(db: AsyncSession, code: str) -> Branch | None:
    result = await db.execute(select(Branch).where(Branch.code == code))
    return result.scalar_one_or_none()


async def get_branches(
    db: AsyncSession, redis: Redis | None = None, skip: int = 0, limit: int = 100
) -> list[Branch] | list[BranchRead]:
    key = make_list_key("branches", skip=skip, limit=limit)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [BranchRead(**item) for item in cached]
    result = await db.execute(
        select(Branch).offset(skip).limit(limit).order_by(Branch.code)
    )
    branches = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [BranchRead.model_validate(b).model_dump(mode="json") for b in branches],
            ttl=TTL_REFERENCE,
        )
    return branches


async def get_branches_by_department(
    db: AsyncSession,
    department_id: uuid.UUID,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Branch] | list[BranchRead]:
    key = make_list_key(
        "branches", department_id=str(department_id), skip=skip, limit=limit
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [BranchRead(**item) for item in cached]
    result = await db.execute(
        select(Branch)
        .where(Branch.department_id == department_id)
        .order_by(Branch.code)
        .offset(skip)
        .limit(limit)
    )
    branches = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [BranchRead.model_validate(b).model_dump(mode="json") for b in branches],
            ttl=TTL_REFERENCE,
        )
    return branches


async def create_branch(db: AsyncSession, data: BranchCreate, redis: Redis | None = None) -> Branch:
    branch = Branch(**data.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    await _invalidate_cache(redis)
    from app.core.cache import bump_namespace
    await bump_namespace(redis, "search")
    return branch


async def update_branch(
    db: AsyncSession, branch_id: uuid.UUID, data: BranchUpdate, redis: Redis | None = None
) -> Branch | None:
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(branch, key, value)
    await db.commit()
    await db.refresh(branch)
    if redis is not None:
        await redis.delete(make_item_key("branches", str(branch_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return branch


async def delete_branch(
    db: AsyncSession, branch_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        return False
    await db.delete(branch)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("branches", str(branch_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return True