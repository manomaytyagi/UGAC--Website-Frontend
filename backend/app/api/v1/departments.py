import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from redis.asyncio import Redis

from app.crud import departments as dept_crud
from app.database import get_db, get_redis
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter()


@router.get("/", response_model=list[DepartmentRead])
async def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await dept_crud.get_departments(db, redis=redis, skip=skip, limit=limit)


@router.get("/{department_id}", response_model=DepartmentRead)
async def get_department(department_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dept = await dept_crud.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.post("/", response_model=DepartmentRead, status_code=201)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    existing = await dept_crud.get_department_by_code(db, data.code)
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists")
    return await dept_crud.create_department(db, data, redis=redis)


@router.patch("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    dept = await dept_crud.update_department(db, department_id, data, redis=redis)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.delete("/{department_id}", status_code=204)
async def delete_department(
    department_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await dept_crud.delete_department(db, department_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Department not found")
