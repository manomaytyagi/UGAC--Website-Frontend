import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import resources as crud
from app.core.storage import get_presigned_url, object_exists
from app.database import get_db, get_redis
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate

router = APIRouter()


@router.get("/", response_model=list[ResourceRead])
async def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    if category:
        return await crud.get_resources_by_category(db, category, skip=skip, limit=limit)
    return await crud.get_resources(db, redis=redis, skip=skip, limit=limit)


@router.get("/presigned")
async def get_resource_presigned_url(
    key: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    item = await crud.get_active_resource_by_file_url(db, key)
    if item is None:
        raise HTTPException(status_code=404, detail="Resource not found or unavailable")

    if not await object_exists(key):
        raise HTTPException(status_code=404, detail="Resource not found or unavailable")

    url = await get_presigned_url(key)
    if url is None:
        raise HTTPException(status_code=404, detail="Resource not found or unavailable")
    return {"key": key, "url": url}


@router.get("/{resource_id}", response_model=ResourceRead)
async def get_resource(resource_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await crud.get_resource(db, resource_id)
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    return item


@router.post("/", response_model=ResourceRead, status_code=201)
async def create_resource(
    data: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await crud.create_resource(db, data, redis=redis)


@router.patch("/{resource_id}", response_model=ResourceRead)
async def update_resource(
    resource_id: uuid.UUID,
    data: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    item = await crud.update_resource(db, resource_id, data, redis=redis)
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    return item


@router.delete("/{resource_id}", status_code=204)
async def delete_resource(
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    deleted = await crud.delete_resource(db, resource_id, redis=redis)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resource not found")
