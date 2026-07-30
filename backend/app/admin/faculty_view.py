from starlette.requests import Request
from sqladmin import ModelView

from app.models import Faculty


class FacultyAdmin(ModelView, model=Faculty):
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
    name = "Faculty"
    name_plural = "Faculty"
    icon = "fa-solid fa-chalkboard-user"
