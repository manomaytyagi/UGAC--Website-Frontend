from starlette.requests import Request
from sqladmin import ModelView
from sqladmin.fields import FileField
from wtforms import SelectField

from app.admin._blob_mixin import BlobImageAdmin
from app.admin._cache_mixin import CacheInvalidatingAdmin
from app.core.blob import handle_admin_image_upload
from app.crud.team import LIST_INVALIDATE
from app.core.storage import upload_to_blob
from app.models import TeamMember


class TeamMemberAdmin(BlobImageAdmin, CacheInvalidatingAdmin, ModelView, model=TeamMember):
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
        TeamMember.roll_number,
        TeamMember.phone,
        TeamMember.instagram,
        TeamMember.team_name,
        TeamMember.order,
        TeamMember.is_active,
        TeamMember.is_featured,
    ]
    column_searchable_list = [TeamMember.name, TeamMember.role]
    column_sortable_list = [TeamMember.order, TeamMember.name]
    column_default_sort = (TeamMember.order, False)
    form_excluded_columns = [TeamMember.created_at, TeamMember.updated_at]
    form_overrides = {"photo_url": FileField, "type": SelectField}
    image_field = "photo_url"
    form_args = {
        "type": {
            "choices": [
                ("council", "Council"),
                ("faculty", "Faculty"),
                ("secretary", "Secretary"),
                ("support", "Support"),
                ("hall_of_fame", "Hall of Fame (Past Secretary)"),
            ]
        },
        "photo_url": {"label": "Photo"},
    }

    async def on_model_change(self, data: dict, model, is_created: bool, request) -> None:
        upload = data.get("photo_url")
        if upload is not None and getattr(upload, "filename", ""):
            content = await upload.read()
            data["photo_url"] = await upload_to_blob(
                content, f"team/{upload.filename}", upload.content_type
            )
        else:
            data.pop("photo_url", None)

    name = "Team Member"
    name_plural = "Team Members"
    icon = "fa-solid fa-users"
    invalidate_patterns = (LIST_INVALIDATE,)

    async def on_model_change(
        self, data: dict, model: TeamMember, is_created: bool, request: Request
    ) -> None:
        await handle_admin_image_upload(data, "photo_url", model)
