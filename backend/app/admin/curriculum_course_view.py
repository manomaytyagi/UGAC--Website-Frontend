from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import CurriculumCourse


class CurriculumCourseAdmin(CacheInvalidatingAdmin, ModelView, model=CurriculumCourse):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        CurriculumCourse.id,
        CurriculumCourse.curriculum_id,
        CurriculumCourse.course_id,
        CurriculumCourse.semester,
        CurriculumCourse.category,
        CurriculumCourse.is_optional,
        CurriculumCourse.basket_id,
    ]
    form_columns = [
        CurriculumCourse.curriculum,
        CurriculumCourse.course,
        CurriculumCourse.semester,
        CurriculumCourse.category,
        CurriculumCourse.is_optional,
        CurriculumCourse.basket,
    ]
    column_sortable_list = [CurriculumCourse.semester, CurriculumCourse.category]
    column_default_sort = (CurriculumCourse.semester, False)
    name = "Curriculum Course"
    name_plural = "Curriculum Courses"
    icon = "fa-solid fa-book-open"
    invalidate_patterns = ("curricula:*",)
