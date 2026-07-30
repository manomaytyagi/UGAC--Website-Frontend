from starlette.requests import Request
from sqladmin import ModelView
from wtforms import SelectField

from app.models import TeamMember


class TeamMemberAdmin(ModelView, model=TeamMember):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        TeamMember.id,
        TeamMember.name,
        TeamMember.role,
        TeamMember.type,
        TeamMember.email,
        TeamMember.portfolio,
        TeamMember.council_session,
        TeamMember.branch_code,
        TeamMember.batch_year,
        TeamMember.team_name,
        TeamMember.order,
        TeamMember.is_active,
        TeamMember.is_featured,
    ]
    column_searchable_list = [TeamMember.name, TeamMember.role]
    column_sortable_list = [TeamMember.order, TeamMember.name]
    column_default_sort = (TeamMember.order, False)
    form_excluded_columns = [TeamMember.created_at, TeamMember.updated_at]
    form_overrides = {"type": SelectField}
    form_args = {
        "type": {
            "choices": [
                ("council", "Council"),
                ("faculty", "Faculty"),
                ("secretary", "Secretary"),
                ("support", "Support"),
            ]
        }
    }
    name = "Team Member"
    name_plural = "Team Members"
    icon = "fa-solid fa-users"
