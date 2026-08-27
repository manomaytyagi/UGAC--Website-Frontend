import mimetypes
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

# Canonical extension per sniffed type. mimetypes.guess_extension is not used —
# it returns ".jpe" for image/jpeg on some platforms.
EXT_FOR_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


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

    # Extension comes from the sniffed type, never from file.filename — a caller
    # could otherwise send %PDF-prefixed bytes named "x.html", and get_file's
    # mimetypes.guess_type(key) would then serve it as text/html on our origin.
    ext = EXT_FOR_TYPE[detected]
    key = f"uploads/{uuid.uuid4()}{ext}"
    await upload_fileobj(file.file, key)
    url = await get_presigned_url(key)
    return {"key": key, "url": url, "filename": file.filename}


@router.get("/file/{key:path}")
async def get_file(key: str):
    try:
        data = await download_fileobj(key)
    except (ValueError, FileNotFoundError):
        # ValueError = key escaped the storage root. Answer 404 either way, so a
        # traversal probe is indistinguishable from an ordinary miss.
        raise HTTPException(status_code=404, detail="File not found")
    if data is None:
        raise HTTPException(status_code=404, detail="File not found")
    content_type, _ = mimetypes.guess_type(key)
    return Response(
        content=data,
        media_type=content_type or "application/octet-stream",
        # Defence in depth behind the extension fix: never let a stored file render
        # inline on this origin.
        headers={"Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff"},
    )


@router.delete("/file/{key:path}", status_code=204)
async def delete_file(key: str):
    try:
        deleted = await delete_object(key)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
