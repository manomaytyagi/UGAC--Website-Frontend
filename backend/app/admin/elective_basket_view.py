from starlette.requests import Request
from sqladmin import ModelView

from app.admin._cache_mixin import CacheInvalidatingAdmin

from app.models import ElectiveBasket


class ElectiveBasketAdmin(CacheInvalidatingAdmin, ModelView, model=ElectiveBasket):
    def is_accessible(self, request: Request) -> bool:
        return request.session.get("admin",False)
    column_list = [
        ElectiveBasket.id,
        ElectiveBasket.curriculum_id,
        ElectiveBasket.name,
        ElectiveBasket.min_credits,
        ElectiveBasket.max_credits,
        ElectiveBasket.semester,
    ]
    column_searchable_list = [ElectiveBasket.name]
    column_sortable_list = [ElectiveBasket.semester]
    form_excluded_columns = [ElectiveBasket.created_at, ElectiveBasket.updated_at]
    name = "Elective Basket"
    name_plural = "Elective Baskets"
    icon = "fa-solid fa-layer-group"
    invalidate_patterns = ("curricula:*",)
