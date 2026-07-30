import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import announcements as crud
from app.database import get_db, get_redis
from app.schemas.announcement import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate

router = APIRouter()


@router.get("/", response_model=list[AnnouncementRead])
async def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: str | None = Query(default=None),
    pinned: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    if pinned is True:
        return await crud.get_pinned_announcements(db, skip=skip, limit=limit)
    if category:
        return await crud.get_announcements_by_category(db, category, skip=skip, limit=limit)
    return await crud.get_announcements(db, redis=redis, skip=skip, limit=limit)


@router.get("/{announcement_id}", response_model=AnnouncementRead)
async def get_announcement(announcement_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await crud.get_announcement(db, announcement_id)
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return item


@router.post("/", response_model=AnnouncementRead, status_code=201)
async def create_announcement(
    data: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.create_announcement(db, data, redis=redis)


@router.patch("/{announcement_id}", response_model=AnnouncementRead)
async def update_announcement(
    announcement_id: uuid.UUID,
    data: AnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    item = await crud.update_announcement(db, announcement_id, data, redis=redis)
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return item


@router.delete("/{announcement_id}", status_code=204)
async def delete_announcement(
    announcement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete_announcement(db, announcement_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Announcement not found")
