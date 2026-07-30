from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.schemas.course import (
    CourseCreate,
    CourseLite,
    CourseRead,
    CourseUpdate,
    PrerequisiteCreate,
    PrerequisiteRead,
)
from app.schemas.curriculum import (
    CurriculumCourseCreate,
    CurriculumCourseRead,
    CurriculumCreate,
    CurriculumRead,
    CurriculumUpdate,
    ElectiveBasketCreate,
    ElectiveBasketRead,
    ElectiveBasketUpdate,
)
from app.schemas.review import CourseReviewCreate, CourseReviewModerate, CourseReviewOut
from app.schemas.team import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate
from app.schemas.announcement import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate
from app.schemas.faculty import FacultyCreate, FacultyRead, FacultyUpdate
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate

__all__ = [
    "BranchCreate",
    "BranchRead",
    "BranchUpdate",
    "DepartmentCreate",
    "DepartmentRead",
    "DepartmentUpdate",
    "CourseCreate",
    "CourseLite",
    "CourseRead",
    "CourseUpdate",
    "PrerequisiteCreate",
    "PrerequisiteRead",
    "CurriculumCreate",
    "CurriculumCourseCreate",
    "CurriculumCourseRead",
    "CurriculumRead",
    "CurriculumUpdate",
    "ElectiveBasketCreate",
    "ElectiveBasketRead",
    "ElectiveBasketUpdate",
    "CourseReviewCreate",
    "CourseReviewModerate",
    "CourseReviewOut",
    "TeamMemberCreate",
    "TeamMemberOut",
    "TeamMemberUpdate",
    "AnnouncementCreate",
    "AnnouncementRead",
    "AnnouncementUpdate",
    "FacultyCreate",
    "FacultyRead",
    "FacultyUpdate",
    "ResourceCreate",
    "ResourceRead",
    "ResourceUpdate",
]
