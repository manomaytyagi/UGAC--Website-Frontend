import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import curriculum as curr_crud
from app.database import get_db, get_redis
from app.models.branches import Branch
from app.schemas.curriculum import (
    CurriculumCourseCreate,
    CurriculumCourseRead,
    CurriculumCreate,
    CurriculumRead,
    CurriculumUpdate,
    ElectiveBasketCreate,
    ElectiveBasketRead,
    ElectiveBasketUpdate,
)

router = APIRouter()
logger = logging.getLogger("ugac.api.curricula")


@router.get("/", response_model=list[CurriculumRead])
async def list_curricula(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    branch: str | None = Query(default=None),   
    batch: int | None = Query(default=None),    
    semester: int | None = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    resolved_branch_id: uuid.UUID | None = None
    if branch is not None:
        result = await db.execute(select(Branch.id).where(Branch.code == branch))
        resolved_branch_id = result.scalar_one_or_none()
        if resolved_branch_id is None:
            raise HTTPException(status_code=404, detail=f"Unknown branch code: {branch}")

    try:
        return await curr_crud.get_curricula(
            db,
            redis=redis,
            skip=skip,
            limit=limit,
            branch_id=resolved_branch_id,
            batch_year=batch,
            semester=semester,
        )
    except Exception:
        logger.exception("Failed to list curricula")
        raise


@router.get("/{curriculum_id}", response_model=CurriculumRead)
async def get_curriculum(
    curriculum_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curr


@router.post("/", response_model=CurriculumRead, status_code=201)
async def create_curriculum(
    data: CurriculumCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await curr_crud.create_curriculum(db, data, redis=redis)


@router.patch("/{curriculum_id}", response_model=CurriculumRead)
async def update_curriculum(
    curriculum_id: uuid.UUID,
    data: CurriculumUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    curr = await curr_crud.update_curriculum(db, curriculum_id, data, redis=redis)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curr


@router.delete("/{curriculum_id}", status_code=204)
async def delete_curriculum(
    curriculum_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await curr_crud.delete_curriculum(db, curriculum_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Curriculum not found")


@router.get("/{curriculum_id}/courses", response_model=list[CurriculumCourseRead])
async def list_curriculum_courses(
    curriculum_id: uuid.UUID,
    semester: int | None = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return await curr_crud.get_curriculum_courses(
        db, curriculum_id, semester=semester
    )


@router.post(
    "/{curriculum_id}/courses",
    response_model=CurriculumCourseRead,
    status_code=201,
)
async def add_curriculum_course(
    curriculum_id: uuid.UUID,
    data: CurriculumCourseCreate,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return await curr_crud.add_curriculum_course(db, curriculum_id, data)


@router.delete("/{curriculum_id}/courses/{cc_id}", status_code=204)
async def remove_curriculum_course(
    curriculum_id: uuid.UUID,
    cc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await curr_crud.remove_curriculum_course(db, curriculum_id, cc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Curriculum course not found")


@router.get(
    "/{curriculum_id}/elective-baskets",
    response_model=list[ElectiveBasketRead],
)
async def list_elective_baskets(
    curriculum_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return await curr_crud.get_elective_baskets(db, curriculum_id)


@router.post(
    "/{curriculum_id}/elective-baskets",
    response_model=ElectiveBasketRead,
    status_code=201,
)
async def create_elective_basket(
    curriculum_id: uuid.UUID,
    data: ElectiveBasketCreate,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return await curr_crud.create_elective_basket(db, curriculum_id, data)


@router.put(
    "/{curriculum_id}/elective-baskets/{basket_id}",
    response_model=ElectiveBasketRead,
)
async def update_elective_basket(
    curriculum_id: uuid.UUID,
    basket_id: uuid.UUID,
    data: ElectiveBasketUpdate,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    basket = await curr_crud.update_elective_basket(db, basket_id, data)
    if not basket:
        raise HTTPException(status_code=404, detail="Elective basket not found")
    return basket


@router.delete(
    "/{curriculum_id}/elective-baskets/{basket_id}",
    status_code=204,
)
async def delete_elective_basket(
    curriculum_id: uuid.UUID,
    basket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    curr = await curr_crud.get_curriculum(db, curriculum_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    deleted = await curr_crud.delete_elective_basket(db, basket_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Elective basket not found")