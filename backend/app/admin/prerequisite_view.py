from starlette.requests import Request
from sqladmin import ModelView

from app.models import CoursePrerequisite


class PrerequisiteAdmin(ModelView, model=CoursePrerequisite):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        CoursePrerequisite.course_id,
        CoursePrerequisite.prerequisite_id,
        CoursePrerequisite.type,
    ]
    column_searchable_list = [CoursePrerequisite.type]
    column_sortable_list = [CoursePrerequisite.type]
    column_default_sort = (CoursePrerequisite.course_id, False)
    form_excluded_columns = []
    name = "Prerequisite"
    name_plural = "Prerequisites"
    icon = "fa-solid fa-link"
