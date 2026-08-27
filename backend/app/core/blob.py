from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any
from urllib.parse import urlparse

import vercel_blob

from app.config import settings

logger = logging.getLogger("ugac.blob")

# Same magic-byte sniffing as api/v1/storage.py, images only — admin uploads
# are photo fields. Extension comes from the sniffed type, never the filename.
MAGIC_MAP = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
}
EXT_FOR_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com"
_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_PENDING_DELETE_ATTR = "_ugac_pending_blob_deletes"


def _is_configured() -> bool:
    return bool(settings.BLOB_READ_WRITE_TOKEN)


async def upload_image(data: bytes) -> str:
    """Upload image bytes to Vercel Blob, return the permanent public URL."""
    if not _is_configured():
        raise RuntimeError(
            "BLOB_READ_WRITE_TOKEN is not set — add it to the environment to use image uploads"
        )
    detected = next(
        (mime for magic, mime in MAGIC_MAP.items() if data.startswith(magic)), None
    )
    if detected is None:
        raise ValueError("File type not recognized. Allowed: JPEG, PNG, GIF, WebP")
    key = f"uploads/{uuid.uuid4()}{EXT_FOR_TYPE[detected]}"
    # content type comes from the key extension (SDK guesses it), hence ext above
    result = await asyncio.to_thread(
        vercel_blob.put,
        key,
        data,
        {"addRandomSuffix": False, "token": settings.BLOB_READ_WRITE_TOKEN},
    )
    url = result.get("url")
    if not url:
        raise RuntimeError(f"Vercel Blob returned no URL for {key}")
    logger.info("Uploaded blob %s", url)
    return url


async def delete_blob(url: str | None) -> None:
    """Delete a blob we own. Best-effort — a failed delete must not fail the save."""
    host = urlparse(url).hostname if url else None
    if not host or not host.endswith(_BLOB_HOST_SUFFIX) or not _is_configured():
        return
    try:
        await asyncio.to_thread(
            vercel_blob.delete, url, {"token": settings.BLOB_READ_WRITE_TOKEN}
        )
        logger.info("Deleted blob %s", url)
    except Exception:
        logger.warning("Failed to delete blob %s", url, exc_info=True)


async def handle_admin_image_upload(
    data: dict[str, Any], field: str, model: Any
) -> None:
    """sqladmin glue: turn a FileField submission into a stored Vercel Blob URL.

    The value arrives as a starlette UploadFile (sqladmin's FileField keeps the
    framework's upload object; wtforms does not wrap it).

    - Empty upload → clear the stored URL.
    - Edit without a new file → sqladmin fakes an UploadFile from the stored
      URL (filename == existing) → drop the field so the DB value survives.
    - New file → upload to Vercel Blob, store the URL and schedule the
      replaced blob for deletion after the database transaction commits.
    """
    existing = getattr(model, field, None)
    upload = data.get(field)
    if upload is None:
        return

    filename = getattr(upload, "filename", "")
    if not filename:
        data[field] = None
        _queue_blob_delete(model, existing)
        return
    if upload.filename == existing:
        data.pop(field, None)
        return

    content = await upload.read()
    if len(content) > _MAX_IMAGE_BYTES:
        raise ValueError("Image must be 5 MB or smaller")
    data[field] = await upload_image(content)
    _queue_blob_delete(model, existing)


def _queue_blob_delete(model: Any, url: str | None) -> None:
    if not url:
        return
    pending = getattr(model, _PENDING_DELETE_ATTR, [])
    if url not in pending:
        pending.append(url)
    setattr(model, _PENDING_DELETE_ATTR, pending)


async def delete_pending_blobs(model: Any) -> None:
    """Delete replacement blobs only after sqladmin has committed the model."""
    pending = getattr(model, _PENDING_DELETE_ATTR, [])
    for url in pending:
        await delete_blob(url)
    setattr(model, _PENDING_DELETE_ATTR, [])
