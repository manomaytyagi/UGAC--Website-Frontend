from starlette.requests import Request
from sqladmin import ModelView

from app.models import Curriculum


class CurriculumAdmin(ModelView, model=Curriculum):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Curriculum.id,
        Curriculum.name,
        Curriculum.batch_year,
        Curriculum.branch,
        Curriculum.total_credits,
        Curriculum.specialization,
        Curriculum.ic_compulsory_credits,
        Curriculum.dc_credits,
        Curriculum.de_credits,
        Curriculum.fe_credits,
        Curriculum.icb_credits,
        Curriculum.hss_iks_credits,
        Curriculum.mtp_credits,
        Curriculum.istp_credits,
        Curriculum.research_credits,
        Curriculum.created_at,
    ]
    column_searchable_list = [Curriculum.name]
    column_sortable_list = [Curriculum.batch_year, Curriculum.total_credits]
    column_default_sort = (Curriculum.batch_year, True)
    form_excluded_columns = [Curriculum.created_at, Curriculum.updated_at]
    name = "Curriculum"
    name_plural = "Curricula"
    icon = "fa-solid fa-graduation-cap"
