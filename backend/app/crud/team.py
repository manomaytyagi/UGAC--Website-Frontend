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
from app.models.team import TeamMember
from app.schemas.team import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

LIST_INVALIDATE = "team:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_all(
    db: AsyncSession,
    redis: Redis | None = None,
    active_only: bool = True,
) -> list[TeamMember] | list[TeamMemberOut]:
    key = make_list_key("team", active_only=active_only)
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [TeamMemberOut(**item) for item in cached]
    q = select(TeamMember)
    if active_only:
        q = q.where(TeamMember.is_active == True)
    q = q.order_by(TeamMember.order, TeamMember.name)
    result = await db.execute(q)
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [TeamMemberOut.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def get_by_id(
    db: AsyncSession, member_id: uuid.UUID, redis: Redis | None = None
) -> TeamMember | TeamMemberOut | None:
    if redis is not None:
        key = make_item_key("team", str(member_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return TeamMemberOut(**cached)
    result = await db.execute(select(TeamMember).where(TeamMember.id == member_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("team", str(member_id)),
            TeamMemberOut.model_validate(item).model_dump(mode="json"),
            ttl=TTL_CATALOG,
        )
    return item


async def create(
    db: AsyncSession, data: TeamMemberCreate, redis: Redis | None = None
) -> TeamMember:
    member = TeamMember(**data.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    await _invalidate_cache(redis)
    return member


async def update(
    db: AsyncSession,
    member_id: uuid.UUID,
    data: TeamMemberUpdate,
    redis: Redis | None = None,
) -> TeamMember | None:
    result = await db.execute(select(TeamMember).where(TeamMember.id == member_id))
    member = result.scalar_one_or_none()
    if member is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    await db.commit()
    await db.refresh(member)
    if redis is not None:
        await redis.delete(make_item_key("team", str(member_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return member


async def delete(
    db: AsyncSession, member_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(TeamMember).where(TeamMember.id == member_id))
    member = result.scalar_one_or_none()
    if member is None:
        return False
    await db.delete(member)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("team", str(member_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return True