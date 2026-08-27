from starlette.requests import Request
from sqladmin import ModelView
from sqladmin.fields import FileField

from app.admin._blob_mixin import BlobImageAdmin
from app.admin._cache_mixin import CacheInvalidatingAdmin
from app.core.blob import handle_admin_image_upload

from app.core.storage import upload_to_blob
from app.models import Faculty


class FacultyAdmin(BlobImageAdmin, CacheInvalidatingAdmin, ModelView, model=Faculty):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Faculty.id,
        Faculty.name,
        Faculty.email,
        Faculty.designation,
        Faculty.department_id,
        Faculty.branch_id,
        Faculty.batch_year,
        Faculty.office_location,
        Faculty.is_active,
    ]
    column_searchable_list = [Faculty.name, Faculty.email, Faculty.designation]
    column_sortable_list = [Faculty.name, Faculty.department_id, Faculty.branch_id, Faculty.batch_year, Faculty.is_active]
    column_default_sort = (Faculty.name, False)
    form_excluded_columns = [Faculty.created_at, Faculty.updated_at]
    form_overrides = {"photo_url": FileField}

    async def on_model_change(
        self, data: dict, model: Faculty, is_created: bool, request: Request
    ) -> None:
        await handle_admin_image_upload(data, "photo_url", model)

    image_field = "photo_url"
    name = "Faculty"
    name_plural = "Faculty"
    icon = "fa-solid fa-chalkboard-user"
    invalidate_patterns = ("faculty:list:*",)
