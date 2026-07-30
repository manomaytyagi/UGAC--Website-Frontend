import mimetypes
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from app.config import settings
from app.core.storage import delete_object, download_fileobj, get_presigned_url, upload_fileobj

router = APIRouter()

MAGIC_MAP = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
    b"%PDF": "application/pdf",
}
ALLOWED_TYPES = set(MAGIC_MAP.values())


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    head = await file.read(16)
    await file.seek(0)

    detected = None
    for magic_bytes, mime in MAGIC_MAP.items():
        if head.startswith(magic_bytes):
            detected = mime
            break

    if detected is None:
        raise HTTPException(status_code=400, detail="File type not recognized. Allowed: JPEG, PNG, GIF, WebP, PDF")

    ext = os.path.splitext(file.filename or "file")[1]
    key = f"uploads/{uuid.uuid4()}{ext}"
    await upload_fileobj(file.file, key)
    url = await get_presigned_url(key)
    return {"key": key, "url": url, "filename": file.filename}


@router.get("/file/{key:path}")
async def get_file(key: str):
    data = await download_fileobj(key)
    if data is None:
        raise HTTPException(status_code=404, detail="File not found")
    content_type, _ = mimetypes.guess_type(key)
    return Response(content=data, media_type=content_type or "application/octet-stream")


@router.delete("/file/{key:path}", status_code=204)
async def delete_file(key: str):
    deleted = await delete_object(key)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
