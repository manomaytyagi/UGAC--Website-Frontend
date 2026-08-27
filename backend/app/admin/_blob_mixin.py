from typing import Any, ClassVar

from starlette.requests import Request

from app.core.blob import delete_blob, delete_pending_blobs


class BlobImageAdmin:
    """Manage Vercel Blob lifecycle for a string URL column in SQLAdmin."""

    image_field: ClassVar[str]

    async def after_model_change(
        self, data: dict, model: Any, is_created: bool, request: Request
    ) -> None:
        await super().after_model_change(data, model, is_created, request)
        await delete_pending_blobs(model)

    async def after_model_delete(self, model: Any, request: Request) -> None:
        await super().after_model_delete(model, request)
        await delete_blob(getattr(model, self.image_field, None))
