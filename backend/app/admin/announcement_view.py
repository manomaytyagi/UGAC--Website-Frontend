from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import Announcement


class AnnouncementAdmin(CacheInvalidatingAdmin, ModelView, model=Announcement):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Announcement.id,
        Announcement.title,
        Announcement.category,
        Announcement.is_pinned,
        Announcement.published_at,
        Announcement.is_active,
    ]
    column_searchable_list = [Announcement.title, Announcement.category]
    column_sortable_list = [Announcement.published_at, Announcement.category, Announcement.is_pinned]
    column_default_sort = (Announcement.published_at, True)
    form_excluded_columns = [Announcement.created_at, Announcement.updated_at]
    name = "Announcement"
    name_plural = "Announcements"
    icon = "fa-solid fa-bullhorn"
    invalidate_patterns = ("announcements:list:*",)
