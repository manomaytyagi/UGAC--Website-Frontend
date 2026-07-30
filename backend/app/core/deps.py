from app.config import settings
from app.database import get_db, get_redis

__all__ = ["get_db", "get_redis", "get_settings"]


async def get_settings():
    return settings
