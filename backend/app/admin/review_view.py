from starlette.requests import Request
from sqladmin import ModelView
from wtforms import SelectField

from app.models import CourseReview


class CourseReviewAdmin(ModelView, model=CourseReview):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        CourseReview.id,
        CourseReview.course_id,
        CourseReview.student_name,
        CourseReview.rating,
        CourseReview.status,
        CourseReview.created_at,
    ]
    column_searchable_list = [CourseReview.student_name, CourseReview.review_text]
    column_sortable_list = [CourseReview.rating, CourseReview.status, CourseReview.created_at]
    column_default_sort = (CourseReview.created_at, True)
    form_excluded_columns = [CourseReview.created_at, CourseReview.updated_at]
    form_overrides = {
        "status": SelectField,
        "rating": SelectField,
    }
    form_args = {
        "status": {
            "choices": [
                ("pending", "Pending"),
                ("approved", "Approved"),
                ("rejected", "Rejected"),
            ]
        },
        "rating": {
            "choices": [
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5"),
            ]
        },
    }
    name = "Course Review"
    name_plural = "Course Reviews"
    icon = "fa-solid fa-star"
