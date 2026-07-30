from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path
from typing import BinaryIO

import aioboto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("ugac.storage")

_session = aioboto3.Session()


def _local_path(key: str) -> Path:
    return Path(settings.LOCAL_STORAGE_PATH) / key


def _use_s3() -> bool:
    # Only "local" routes to disk. "" = AWS S3 native; any URL = S3/MinIO endpoint.
    return settings.STORAGE_ENDPOINT != "local"


def _is_aws_native() -> bool:
    """True when STORAGE_ENDPOINT="" — route directly to AWS S3 (no custom endpoint)."""
    return settings.STORAGE_ENDPOINT == ""


def _s3_client():
    kwargs: dict = {
        "aws_access_key_id": settings.STORAGE_ACCESS_KEY or None,
        "aws_secret_access_key": settings.STORAGE_SECRET_KEY or None,
        "region_name": settings.AWS_REGION or None,
    }
    if not _is_aws_native():
        kwargs["endpoint_url"] = settings.STORAGE_ENDPOINT
        kwargs["use_ssl"] = settings.STORAGE_ENDPOINT.startswith("https")
    return _session.client("s3", **kwargs)


async def upload_fileobj(
    file_obj: BinaryIO,
    key: str,
    bucket: str | None = None,
) -> str:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            await s3.upload_fileobj(file_obj, bucket, key)
            logger.info("Uploaded s3://%s/%s", bucket, key)
    else:
        path = _local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        logger.info("Uploaded local://%s", key)
    return key


async def upload_file(
    file_path: str | Path,
    key: str,
    bucket: str | None = None,
) -> str:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            await s3.upload_file(str(file_path), bucket, key)
            logger.info("Uploaded %s → s3://%s/%s", file_path, bucket, key)
    else:
        path = _local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(file_path), path)
        logger.info("Uploaded %s → local://%s", file_path, key)
    return key


async def download_fileobj(
    key: str,
    bucket: str | None = None,
) -> bytes:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            response = await s3.get_object(Bucket=bucket, Key=key)
            data = await response["Body"].read()
        return data
    else:
        path = _local_path(key)
        with open(path, "rb") as f:
            return f.read()


async def download_file(
    key: str,
    dest: str | Path,
    bucket: str | None = None,
) -> Path:
    dest = Path(dest)
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            await s3.download_file(bucket, key, str(dest))
            logger.info("Downloaded s3://%s/%s → %s", bucket, key, dest)
    else:
        shutil.copy2(_local_path(key), dest)
        logger.info("Downloaded local://%s → %s", key, dest)
    return dest


async def list_objects(
    prefix: str = "",
    bucket: str | None = None,
) -> list[dict]:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            response = await s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        return response.get("Contents", [])
    else:
        base = Path(settings.LOCAL_STORAGE_PATH) / prefix
        if not base.exists():
            return []
        items = []
        for p in base.rglob("*"):
            if p.is_file():
                rel = str(p.relative_to(Path(settings.LOCAL_STORAGE_PATH)))
                stat = p.stat()
                items.append({
                    "Key": rel,
                    "Size": stat.st_size,
                    "LastModified": stat.st_mtime,
                })
        return items


async def delete_object(key: str, bucket: str | None = None) -> bool:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            try:
                await s3.delete_object(Bucket=bucket, Key=key)
                logger.info("Deleted s3://%s/%s", bucket, key)
                return True
            except ClientError:
                logger.exception("Failed to delete s3://%s/%s", bucket, key)
                return False
    else:
        path = _local_path(key)
        if path.exists():
            path.unlink()
            logger.info("Deleted local://%s", key)
            return True
        return False


async def object_exists(key: str, bucket: str | None = None) -> bool:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            try:
                await s3.head_object(Bucket=bucket, Key=key)
                return True
            except ClientError:
                return False
    else:
        return _local_path(key).exists()


async def get_presigned_url(
    key: str,
    expiration: int = 3600,
    bucket: str | None = None,
) -> str | None:
    if _use_s3():
        bucket = bucket or settings.STORAGE_BUCKET
        async with _s3_client() as s3:
            try:
                url = await s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=expiration,
                )
                return url
            except ClientError:
                logger.exception("Failed to generate presigned URL for s3://%s/%s", bucket, key)
                return None
    else:
        return f"/storage/file/{key}"
