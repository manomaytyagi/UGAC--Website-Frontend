import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import team as crud
from app.database import get_db, get_redis
from app.schemas.team import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

router = APIRouter()


@router.get("/", response_model=list[TeamMemberOut])
async def list_team(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.get_all(db, redis=redis, active_only=active_only)


@router.get("/{member_id}", response_model=TeamMemberOut)
async def get_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    member = await crud.get_by_id(db, member_id, redis=redis)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")
    return member


@router.post("/", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
async def create_member(
    data: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.create(db, data, redis=redis)


@router.patch("/{member_id}", response_model=TeamMemberOut)
async def update_member(
    member_id: uuid.UUID,
    data: TeamMemberUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    member = await crud.update(db, member_id, data, redis=redis)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete(db, member_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")