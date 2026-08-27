from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import Resource


class ResourceAdmin(CacheInvalidatingAdmin, ModelView, model=Resource):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Resource.id,
        Resource.title,
        Resource.category,
        Resource.file_url,
        Resource.academic_year,
        Resource.is_active,
    ]
    column_searchable_list = [Resource.title, Resource.category]
    column_sortable_list = [Resource.category, Resource.title, Resource.is_active]
    column_default_sort = (Resource.category, Resource.title)
    form_excluded_columns = [Resource.created_at, Resource.updated_at]
    name = "Resource"
    name_plural = "Resources"
    icon = "fa-solid fa-folder-open"
    invalidate_patterns = ("resources:list:*",)
