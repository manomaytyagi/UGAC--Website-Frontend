from fastapi import APIRouter

api_router = APIRouter()

from app.api.v1.branches import router as branches_router
from app.api.v1.departments import router as departments_router
from app.api.v1.courses import router as courses_router
from app.api.v1.curriculum import router as curriculum_router
from app.api.v1.search import router as search_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.team import router as team_router
from app.api.v1.faculty import router as faculty_router
from app.api.v1.announcements import router as announcements_router
from app.api.v1.events import router as events_router
from app.api.v1.resources import router as resources_router
from app.api.v1.storage import router as storage_router
from app.api.v1.cache_admin import router as cache_admin_router


def register_routers():
    api_router.include_router(branches_router, prefix="/branches", tags=["Branches"])
    api_router.include_router(departments_router, prefix="/departments", tags=["Departments"])
    api_router.include_router(courses_router, prefix="/courses", tags=["Courses"])
    api_router.include_router(curriculum_router, prefix="/curriculum", tags=["Curriculum"])
    api_router.include_router(search_router, prefix="/search", tags=["Search"])
    api_router.include_router(reviews_router, prefix="/reviews", tags=["Reviews"])
    api_router.include_router(team_router, prefix="/team", tags=["Team"])
    api_router.include_router(faculty_router, prefix="/faculty", tags=["Faculty"])
    api_router.include_router(announcements_router, prefix="/announcements", tags=["Announcements"])
    api_router.include_router(events_router, prefix="/events", tags=["Events"])
    api_router.include_router(resources_router, prefix="/resources", tags=["Resources"])
    api_router.include_router(storage_router, prefix="/storage", tags=["Storage"])
    api_router.include_router(cache_admin_router, prefix="/debug", tags=["Debug"])
