import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import (
    TTL_CATALOG,
    cache_get,
    cache_invalidate,
    cache_set,
    make_item_key,
    make_list_key,
)
from app.models.curricula import Curriculum, CurriculumCourse, ElectiveBasket
from app.schemas.curriculum import (
    CurriculumCourseCreate,
    CurriculumCreate,
    CurriculumRead,
    CurriculumUpdate,
    ElectiveBasketCreate,
    ElectiveBasketUpdate,
)

LIST_INVALIDATE = "curricula:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_curriculum(
    db: AsyncSession, curriculum_id: uuid.UUID, redis: Redis | None = None
) -> Curriculum | None:
    if redis is not None:
        key = make_item_key("curricula", str(curriculum_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return CurriculumRead(**cached)
    result = await db.execute(
        select(Curriculum)
        .where(Curriculum.id == curriculum_id)
        .options(selectinload(Curriculum.branch))
    )
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("curricula", str(curriculum_id)),
            CurriculumRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_CATALOG,
        )
    return item


async def get_curricula(
    db: AsyncSession,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
    branch_id: uuid.UUID | None = None,
    batch_year: int | None = None,
    semester: int | None = None,
) -> list[Curriculum] | list[CurriculumRead]:
    key = make_list_key(
        "curricula",
        skip=skip,
        limit=limit,
        branch_id=str(branch_id) if branch_id else None,
        batch_year=batch_year,
        semester=semester,
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [CurriculumRead(**item) for item in cached]
    query = select(Curriculum).options(selectinload(Curriculum.branch))
    if branch_id is not None:
        query = query.where(Curriculum.branch_id == branch_id)
    if batch_year is not None:
        query = query.where(Curriculum.batch_year == batch_year)
    if semester is not None:
        query = query.where(
            select(CurriculumCourse.id)
            .where(CurriculumCourse.curriculum_id == Curriculum.id)
            .where(CurriculumCourse.semester == semester)
            .exists()
        )
    query = query.offset(skip).limit(limit).order_by(Curriculum.batch_year.desc())
    result = await db.execute(query)
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [CurriculumRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def get_curricula_by_branch(
    db: AsyncSession,
    branch_id: uuid.UUID,
    redis: Redis | None = None,
) -> list[Curriculum] | list[CurriculumRead]:
    key = make_list_key("curricula", branch_id=str(branch_id), variant="by_branch")
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [CurriculumRead(**item) for item in cached]
    result = await db.execute(
        select(Curriculum)
        .where(Curriculum.branch_id == branch_id)
        .order_by(Curriculum.batch_year.desc())
    )
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [CurriculumRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def create_curriculum(
    db: AsyncSession, data: CurriculumCreate, redis: Redis | None = None
) -> Curriculum:
    curr = Curriculum(**data.model_dump())
    db.add(curr)
    await db.commit()
    await db.refresh(curr)
    await _invalidate_cache(redis)
    return curr


async def update_curriculum(
    db: AsyncSession, curriculum_id: uuid.UUID, data: CurriculumUpdate, redis: Redis | None = None
) -> Curriculum | None:
    # Mutations must bypass the cache: a cache hit is a CurriculumRead
    # response model, while SQLAlchemy needs the mapped Curriculum instance.
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curr = result.scalar_one_or_none()
    if curr is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(curr, key, value)
    await db.commit()
    await db.refresh(curr)
    if redis is not None:
        await redis.delete(make_item_key("curricula", str(curriculum_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return curr


async def delete_curriculum(
    db: AsyncSession, curriculum_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    # See update_curriculum: never pass a cached response model to db.delete().
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curr = result.scalar_one_or_none()
    if curr is None:
        return False
    await db.delete(curr)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("curricula", str(curriculum_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
    return True


async def get_curriculum_courses(
    db: AsyncSession, curriculum_id: uuid.UUID, semester: int | None = None
) -> list[CurriculumCourse]:
    query = select(CurriculumCourse).where(
        CurriculumCourse.curriculum_id == curriculum_id
    )
    if semester is not None:
        query = query.where(CurriculumCourse.semester == semester)
    query = query.order_by(CurriculumCourse.semester)
    result = await db.execute(query)
    return list(result.scalars().all())


async def add_curriculum_course(
    db: AsyncSession, curriculum_id: uuid.UUID, data: CurriculumCourseCreate
) -> CurriculumCourse:
    cc = CurriculumCourse(curriculum_id=curriculum_id, **data.model_dump())
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    return cc


async def remove_curriculum_course(
    db: AsyncSession, curriculum_id: uuid.UUID, cc_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(CurriculumCourse).where(
            CurriculumCourse.id == cc_id,
            CurriculumCourse.curriculum_id == curriculum_id,
        )
    )
    cc = result.scalar_one_or_none()
    if cc is None:
        return False
    await db.delete(cc)
    await db.commit()
    return True


async def get_elective_baskets(
    db: AsyncSession, curriculum_id: uuid.UUID
) -> list[ElectiveBasket]:
    result = await db.execute(
        select(ElectiveBasket)
        .where(ElectiveBasket.curriculum_id == curriculum_id)
        .order_by(ElectiveBasket.semester)
    )
    return list(result.scalars().all())


async def create_elective_basket(
    db: AsyncSession, curriculum_id: uuid.UUID, data: ElectiveBasketCreate
) -> ElectiveBasket:
    basket = ElectiveBasket(curriculum_id=curriculum_id, **data.model_dump())
    db.add(basket)
    await db.commit()
    await db.refresh(basket)
    return basket


async def update_elective_basket(
    db: AsyncSession, basket_id: uuid.UUID, data: ElectiveBasketUpdate
) -> ElectiveBasket | None:
    result = await db.execute(
        select(ElectiveBasket).where(ElectiveBasket.id == basket_id)
    )
    basket = result.scalar_one_or_none()
    if basket is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(basket, key, value)
    await db.commit()
    await db.refresh(basket)
    return basket


async def delete_elective_basket(db: AsyncSession, basket_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(ElectiveBasket).where(ElectiveBasket.id == basket_id)
    )
    basket = result.scalar_one_or_none()
    if basket is None:
        return False
    await db.delete(basket)
    await db.commit()
    return True
