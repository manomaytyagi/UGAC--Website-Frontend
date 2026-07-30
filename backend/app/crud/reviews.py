import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import (
    TTL_REVIEW,
    cache_get,
    cache_invalidate,
    cache_set,
    make_item_key,
    make_list_key,
)
from app.models.reviews import CourseReview
from app.schemas.review import CourseReviewCreate, CourseReviewModerate, CourseReviewOut

LIST_INVALIDATE = "reviews:list:*"
BY_COURSE_INVALIDATE = "reviews:by_course:*"


async def _invalidate_cache(redis: Redis | None) -> None:
    if redis is not None:
        await cache_invalidate(redis, LIST_INVALIDATE)
        await cache_invalidate(redis, BY_COURSE_INVALIDATE)


async def get_all(
    db: AsyncSession,
    redis: Redis | None = None,
    status: str | None = None,
) -> list[CourseReview] | list[CourseReviewOut]:
    key = make_list_key("reviews", status=status or "all")
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [CourseReviewOut(**item) for item in cached]
    q = select(CourseReview).order_by(CourseReview.created_at.desc())
    if status:
        q = q.where(CourseReview.status == status)
    result = await db.execute(q)
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [CourseReviewOut.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_REVIEW,
        )
    return items


async def get_by_id(
    db: AsyncSession, review_id: uuid.UUID, redis: Redis | None = None
) -> CourseReview | CourseReviewOut | None:
    if redis is not None:
        key = make_item_key("reviews", str(review_id))
        cached = await cache_get(redis, key)
        if cached is not None:
            return CourseReviewOut(**cached)
    result = await db.execute(select(CourseReview).where(CourseReview.id == review_id))
    item = result.scalar_one_or_none()
    if item is not None and redis is not None:
        await cache_set(
            redis,
            make_item_key("reviews", str(review_id)),
            CourseReviewOut.model_validate(item).model_dump(mode="json"),
            ttl=TTL_REVIEW,
        )
    return item


async def get_by_course(
    db: AsyncSession,
    course_id: uuid.UUID,
    redis: Redis | None = None,
    approved_only: bool = True,
) -> list[CourseReview] | list[CourseReviewOut]:
    key = make_list_key(
        "reviews",
        course_id=str(course_id),
        approved_only=approved_only,
        variant="by_course",
    )
    if redis is not None:
        cached = await cache_get(redis, key)
        if cached is not None:
            return [CourseReviewOut(**item) for item in cached]
    q = select(CourseReview).where(CourseReview.course_id == course_id)
    if approved_only:
        q = q.where(CourseReview.status == "approved")
    q = q.order_by(CourseReview.created_at.desc())
    result = await db.execute(q)
    items = list(result.scalars().all())
    if redis is not None:
        await cache_set(
            redis,
            key,
            [CourseReviewOut.model_validate(i).model_dump(mode="json") for i in items],
            ttl=TTL_REVIEW,
        )
    return items


async def create(
    db: AsyncSession,
    data: CourseReviewCreate,
    redis: Redis | None = None,
) -> CourseReview:
    review_data = data.model_dump(exclude={"h_captcha_token"})
    review = CourseReview(**review_data, status="pending")
    db.add(review)
    await db.commit()
    await db.refresh(review)
    await _invalidate_cache(redis)
    return review


async def moderate(
    db: AsyncSession,
    review_id: uuid.UUID,
    data: CourseReviewModerate,
    redis: Redis | None = None,
) -> CourseReview | None:
    result = await db.execute(select(CourseReview).where(CourseReview.id == review_id))
    review = result.scalar_one_or_none()
    if review is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    await db.commit()
    await db.refresh(review)
    if redis is not None:
        await redis.delete(make_item_key("reviews", str(review_id)))
        await _invalidate_cache(redis)
    return review


async def delete(
    db: AsyncSession, review_id: uuid.UUID, redis: Redis | None = None
) -> bool:
    result = await db.execute(select(CourseReview).where(CourseReview.id == review_id))
    review = result.scalar_one_or_none()
    if review is None:
        return False
    await db.delete(review)
    await db.commit()
    if redis is not None:
        await redis.delete(make_item_key("reviews", str(review_id)))
        await _invalidate_cache(redis)
    return True