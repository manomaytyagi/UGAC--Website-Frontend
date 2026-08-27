from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import Branch


class BranchAdmin(CacheInvalidatingAdmin, ModelView, model=Branch):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Branch.id,
        Branch.code,
        Branch.name,
        Branch.department_id,
        Branch.degree_type,
        Branch.is_active,
        Branch.created_at,
    ]
    column_searchable_list = [Branch.code, Branch.name]
    column_sortable_list = [Branch.code, Branch.degree_type, Branch.is_active, Branch.created_at]
    column_default_sort = (Branch.code, False)
    form_excluded_columns = [Branch.created_at, Branch.updated_at]
    name = "Branch"
    name_plural = "Branches"
    icon = "fa-solid fa-code-branch"
    invalidate_patterns = ("branches:list:*",)
