import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import faculty as crud
from app.database import get_db, get_redis
from app.schemas.faculty import FacultyCreate, FacultyRead, FacultyUpdate

router = APIRouter()


@router.get("/", response_model=list[FacultyRead])
async def list_faculty(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    department_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    if department_id:
        return await crud.get_faculty_by_department(db, department_id, skip=skip, limit=limit)
    return await crud.get_faculty_list(db, redis=redis, skip=skip, limit=limit)


@router.get("/{faculty_id}", response_model=FacultyRead)
async def get_faculty(faculty_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await crud.get_faculty(db, faculty_id)
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return item


@router.post("/", response_model=FacultyRead, status_code=201)
async def create_faculty(
    data: FacultyCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.create_faculty(db, data, redis=redis)


@router.patch("/{faculty_id}", response_model=FacultyRead)
async def update_faculty(
    faculty_id: uuid.UUID,
    data: FacultyUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    item = await crud.update_faculty(db, faculty_id, data, redis=redis)
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return item


@router.delete("/{faculty_id}", status_code=204)
async def delete_faculty(
    faculty_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete_faculty(db, faculty_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Faculty not found")
