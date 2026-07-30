import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import courses as course_crud
from app.database import get_db, get_redis
from app.schemas.course import (
    CourseCreate,
    CourseLite,
    CourseRead,
    CourseUpdate,
    PrerequisiteCreate,
    PrerequisiteRead,
)

router = APIRouter()
logger = logging.getLogger("ugac.api.courses")


@router.get("/", response_model=list[CourseRead])
async def list_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    department_id: uuid.UUID | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await course_crud.get_courses(
        db, redis=redis, skip=skip, limit=limit, department_id=department_id, search=search
    )


@router.get("/lite", response_model=list[CourseLite])
async def list_courses_lite(db: AsyncSession = Depends(get_db)):
    try:
        return await course_crud.get_courses_lite(db)
    except Exception:
        logger.exception("Failed to list lite courses")
        raise


@router.get("/{course_id}", response_model=CourseRead)
async def get_course(course_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    course = await course_crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/", response_model=CourseRead, status_code=201)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    existing = await course_crud.get_course_by_code(db, data.code)
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists")
    try:
        return await course_crud.create_course(db, data, redis=redis)
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid department_id: department does not exist",
        )


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: uuid.UUID,
    data: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    course = await course_crud.update_course(db, course_id, data, redis=redis)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await course_crud.delete_course(db, course_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Course not found")


@router.get("/{course_id}/prerequisites", response_model=list[PrerequisiteRead])
async def get_prerequisites(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    course = await course_crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return await course_crud.get_course_prerequisites(db, course_id)


@router.post(
    "/{course_id}/prerequisites",
    response_model=list[PrerequisiteRead],
    status_code=201,
)
async def set_prerequisites(
    course_id: uuid.UUID,
    data: list[PrerequisiteCreate],
    db: AsyncSession = Depends(get_db),
):
    course = await course_crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return await course_crud.set_course_prerequisites(db, course_id, data)
