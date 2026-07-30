import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from redis.asyncio import Redis

from app.crud import branches as branch_crud
from app.database import get_db, get_redis
from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate

router = APIRouter()


@router.get("/", response_model=list[BranchRead])
async def list_branches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    department_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    if department_id:
        return await branch_crud.get_branches_by_department(db, department_id, skip=skip, limit=limit)
    return await branch_crud.get_branches(db, redis=redis, skip=skip, limit=limit)


@router.get("/{branch_id}", response_model=BranchRead)
async def get_branch(branch_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    branch = await branch_crud.get_branch(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.post("/", response_model=BranchRead, status_code=201)
async def create_branch(
    data: BranchCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    existing = await branch_crud.get_branch_by_code(db, data.code)
    if existing:
        raise HTTPException(status_code=409, detail="Branch code already exists")
    return await branch_crud.create_branch(db, data, redis=redis)


@router.patch("/{branch_id}", response_model=BranchRead)
async def update_branch(
    branch_id: uuid.UUID,
    data: BranchUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    branch = await branch_crud.update_branch(db, branch_id, data, redis=redis)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.delete("/{branch_id}", status_code=204)
async def delete_branch(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await branch_crud.delete_branch(db, branch_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Branch not found")
