from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import Course


class CourseAdmin(CacheInvalidatingAdmin, ModelView, model=Course):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Course.id,
        Course.code,
        Course.name,
        Course.credits,
        Course.lecture_hours,
        Course.tutorial_hours,
        Course.practical_hours,
        Course.department_id,
        Course.created_at,
    ]
    column_searchable_list = [Course.code, Course.name]
    column_sortable_list = [Course.code, Course.credits, Course.created_at]
    column_default_sort = (Course.code, False)
    form_excluded_columns = [Course.created_at, Course.updated_at]
    name = "Course"
    name_plural = "Courses"
    icon = "fa-solid fa-book"
    invalidate_patterns = ("courses:list:*",)
