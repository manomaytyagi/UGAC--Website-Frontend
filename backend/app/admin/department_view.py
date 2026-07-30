from starlette.requests import Request
from sqladmin import ModelView

from app.models import Department


class DepartmentAdmin(ModelView, model=Department):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Department.id,
        Department.code,
        Department.name,
        Department.description,
        Department.created_at,
    ]
    column_searchable_list = [Department.code, Department.name]
    column_sortable_list = [Department.code, Department.name, Department.created_at]
    column_default_sort = (Department.code, False)
    form_excluded_columns = [Department.created_at, Department.updated_at]
    name = "Department"
    name_plural = "Departments"
    icon = "fa-solid fa-building"
