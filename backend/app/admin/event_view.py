from typing import Any

from starlette.requests import Request
from sqladmin import ModelView
from sqladmin.fields import FileField

from app.admin._blob_mixin import BlobImageAdmin
from app.admin._cache_mixin import CacheInvalidatingAdmin
from app.core.blob import handle_admin_image_upload

from app.core.storage import upload_to_blob
from app.models import Event


class EventAdmin(BlobImageAdmin, CacheInvalidatingAdmin, ModelView, model=Event):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)

    async def on_model_change(
        self, data: dict, model: Any, is_created: bool, request: Request
    ) -> None:
        """Upload a picked banner to Vercel Blob, then normalise the two JSONB
        columns before they reach the DB.

        Both columns are NOT NULL with a server_default of "[]", but a default
        only applies when the column is omitted — sqladmin's JSONField submits an
        explicit None for an empty box and a bare scalar for unbracketed input,
        both of which stick. See issue #18.
        """
        await handle_admin_image_upload(data, "banner_key", model)
        for field, member_type in (("documents", dict), ("tags", str)):
            value = data.get(field)
            if not isinstance(value, list):
                data[field] = []
            else:
                data[field] = [v for v in value if isinstance(v, member_type)]

    column_list = [
        Event.id,
        Event.title,
        Event.event_date,
        Event.end_date,
        Event.location,
        Event.is_active,
        Event.is_featured,
    ]
    column_searchable_list = [Event.title, Event.location]
    column_sortable_list = [Event.event_date, Event.is_featured, Event.is_active]
    column_default_sort = (Event.event_date, False)
    form_excluded_columns = [Event.created_at, Event.updated_at]
    form_overrides = {"banner_key": FileField}
    image_field = "banner_key"
    name = "Event"
    name_plural = "Events"
    icon = "fa-solid fa-calendar-day"
    invalidate_patterns = ("events:list:*",)
