import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.captcha import verify_hcaptcha
from app.core.rate_limit import limiter
from app.crud import reviews as crud
from app.database import get_db, get_redis
from app.schemas.review import CourseReviewCreate, CourseReviewModerate, CourseReviewOut

router = APIRouter()


@router.get("/", response_model=list[CourseReviewOut])
async def list_reviews(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.get_all(db, redis=redis, status=status)


@router.get("/course/{course_id}", response_model=list[CourseReviewOut])
async def list_by_course(
    course_id: uuid.UUID,
    approved_only: bool = True,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.get_by_course(db, course_id, redis=redis, approved_only=approved_only)


@router.get("/{review_id}", response_model=CourseReviewOut)
async def get_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    review = await crud.get_by_id(db, review_id, redis=redis)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.post("/", response_model=CourseReviewOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_review(
    request: Request,
    data: CourseReviewCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    # request.client is None under some ASGI servers — don't 500 on it.
    await verify_hcaptcha(
        data.h_captcha_token, remote_ip=request.client.host if request.client else None
    )
    return await crud.create(db, data, redis=redis)


@router.patch("/{review_id}/moderate", response_model=CourseReviewOut)
async def moderate_review(
    review_id: uuid.UUID,
    data: CourseReviewModerate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    review = await crud.moderate(db, review_id, data, redis=redis)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete(db, review_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")