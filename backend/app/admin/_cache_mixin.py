from typing import Any, ClassVar, Sequence

from starlette.requests import Request

from app.core.cache import cache_invalidate
from app.database import get_redis_client


class CacheInvalidatingAdmin:
    """Drop cached list payloads after a sqladmin write.

    sqladmin writes through SQLAlchemy directly, so the invalidation inside
    app.crud.* never runs for panel edits and Redis keeps serving the stale list
    for the full TTL (TTL_CATALOG = 600s). Subclasses set `invalidate_patterns`
    to the same glob(s) their crud module uses.

    Mix in BEFORE ModelView so these hooks win over the no-op base ones:
        class CourseAdmin(CacheInvalidatingAdmin, ModelView, model=Course): ...
    """

    invalidate_patterns: ClassVar[Sequence[str]] = ()

    async def _drop_cache(self) -> None:
        redis = get_redis_client()
        for pattern in self.invalidate_patterns:
            await cache_invalidate(redis, pattern)

    async def after_model_change(
        self, data: dict, model: Any, is_created: bool, request: Request
    ) -> None:
        await self._drop_cache()

    async def after_model_delete(self, model: Any, request: Request) -> None:
        await self._drop_cache()
