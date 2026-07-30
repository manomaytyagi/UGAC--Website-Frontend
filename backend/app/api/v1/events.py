import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import events as crud
from app.core.storage import get_presigned_url, object_exists
from app.database import get_db, get_redis
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter()


@router.get("/", response_model=list[EventRead])
async def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    upcoming_only: bool = Query(default=False),
    is_featured: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.get_all(
        db, redis=redis, skip=skip, limit=limit,
        upcoming_only=upcoming_only, is_featured=is_featured,
    )


@router.get("/banner")
async def get_event_banner_url(
    key: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.get_active_by_banner_key(db, key)
    if event is None:
        raise HTTPException(status_code=404, detail="Banner not found or unavailable")

    if not await object_exists(key):
        raise HTTPException(status_code=404, detail="Banner not found or unavailable")

    url = await get_presigned_url(key)
    if url is None:
        raise HTTPException(status_code=404, detail="Banner not found or unavailable")
    return {"key": key, "url": url}


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    event = await crud.get_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.create(db, data, redis=redis)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    event = await crud.update(db, event_id, data, redis=redis)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete(db, event_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
