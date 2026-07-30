from starlette.requests import Request
from sqladmin import ModelView

from app.models import Event


class EventAdmin(ModelView, model=Event):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        Event.id,
        Event.title,
        Event.event_date,
        Event.end_date,
        Event.location,
        Event.is_active,
        Event.is_featured,
    ]
    column_searchable_list = [Event.title, Event.location]
    column_sortable_list = [Event.event_date, Event.is_featured, Event.is_active]
    column_default_sort = (Event.event_date, False)
    form_excluded_columns = [Event.created_at, Event.updated_at]
    name = "Event"
    name_plural = "Events"
    icon = "fa-solid fa-calendar-day"
