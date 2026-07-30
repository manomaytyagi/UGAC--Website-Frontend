import logging
import uuid

from redis.asyncio import Redis
from sqlalchemy import delete, or_, select
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
from app.models.courses import Course, CoursePrerequisite
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate, PrerequisiteCreate

logger = logging.getLogger("ugac.crud.courses")

LIST_INVALIDATE = "courses:list:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)


async def get_course(
    db: AsyncSession, course_id: uuid.UUID, redis: Redis | None = None
) -> Course | CourseRead | None:
    if redis is not None:
        key = make_item_key("courses", str(course_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return CourseRead(**cached)
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(selectinload(Course.department))
    )
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("courses", str(course_id)),
            CourseRead.model_validate(item).model_dump(mode="json"),
            ttl=TTL_CATALOG,
        )
    return item


async def get_course_by_code(db: AsyncSession, code: str) -> Course | None:
    result = await db.execute(
        select(Course).where(Course.code == code).options(selectinload(Course.department))
    )
    return result.scalar_one_or_none()


async def get_courses(
    db: AsyncSession,
    redis: Redis | None = None,
    skip: int = 0,
    limit: int = 100,
    department_id: uuid.UUID | None = None,
    search: str | None = None,
) -> list[Course] | list[CourseRead]:
    key = make_list_key(
        "courses",
        skip=skip,
        limit=limit,
        department_id=str(department_id) if department_id else None,
        search=search,
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [CourseRead(**item) for item in cached]

    query = select(Course).options(selectinload(Course.department))
    if department_id is not None:
        query = query.where(Course.department_id == department_id)
    if search:
        query = query.where(
            or_(
                Course.code.ilike(f"%{search}%"),
                Course.name.ilike(f"%{search}%"),
            )
        )
    query = query.offset(skip).limit(limit).order_by(Course.code)
    result = await db.execute(query)
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [CourseRead.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_CATALOG,
        )
    return items


async def get_courses_lite(db: AsyncSession) -> list[Course]:
    result = await db.execute(select(Course).order_by(Course.code))
    return list(result.scalars().all())


async def search_courses(
    db: AsyncSession, query: str, limit: int = 20
) -> list[Course]:
    result = await db.execute(
        select(Course)
        .where(
            or_(
                Course.code.ilike(f"%{query}%"),
                Course.name.ilike(f"%{query}%"),
            )
        )
        .limit(limit)
        .order_by(Course.code)
    )
    return list(result.scalars().all())


async def create_course(
    db: AsyncSession, data: CourseCreate, redis: Redis | None = None
) -> Course:
    course = Course(**data.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    await _invalidate_cache(redis)
    from app.core.cache import bump_namespace
    await bump_namespace(redis, "search")
    return course


async def update_course(
    db: AsyncSession, course_id: uuid.UUID, data: CourseUpdate, redis: Redis | None = None
) -> Course | None:
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(selectinload(Course.department))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)
    await db.commit()
    await db.refresh(course)
    if redis is not None:
        await redis.delete(make_item_key("courses", str(course_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return course


async def delete_course(
    db: AsyncSession, course_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(selectinload(Course.department))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return False
    await db.delete(course)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("courses", str(course_id)))
        await cache_invalidate(redis, LIST_INVALIDATE)
        from app.core.cache import bump_namespace
        await bump_namespace(redis, "search")
    return True


async def get_course_prerequisites(
    db: AsyncSession, course_id: uuid.UUID
) -> list[CoursePrerequisite]:
    result = await db.execute(
        select(CoursePrerequisite).where(CoursePrerequisite.course_id == course_id)
    )
    return list(result.scalars().all())


async def set_course_prerequisites(
    db: AsyncSession, course_id: uuid.UUID, prereqs: list[PrerequisiteCreate]
) -> list[CoursePrerequisite]:
    await db.execute(
        delete(CoursePrerequisite).where(CoursePrerequisite.course_id == course_id)
    )
    rows = [
        CoursePrerequisite(
            course_id=course_id,
            prerequisite_id=p.prerequisite_id,
            type=p.type,
        )
        for p in prereqs
    ]
    for row in rows:
        db.add(row)
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return rows