from starlette.requests import Request
from sqladmin import ModelView

from app.models import CurriculumCourse


class CurriculumCourseAdmin(ModelView, model=CurriculumCourse):
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
    column_sortable_list = [CurriculumCourse.semester, CurriculumCourse.category]
    column_default_sort = (CurriculumCourse.semester, False)
    form_excluded_columns = [CurriculumCourse.created_at, CurriculumCourse.updated_at]
    name = "Curriculum Course"
    name_plural = "Curriculum Courses"
    icon = "fa-solid fa-book-open"
