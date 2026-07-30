import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    code: str = Field(max_length=20)
    name: str = Field(max_length=300)
    credits: int = Field(ge=0, le=30)
    lecture_hours: float | None = Field(default=None, ge=0)
    tutorial_hours: float | None = Field(default=None, ge=0)
    practical_hours: float | None = Field(default=None, ge=0)
    department_id: uuid.UUID | None = None
    syllabus_url: str | None = Field(default=None, max_length=500)
    extra_data: dict | None = None


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=20)
    name: str | None = Field(default=None, max_length=300)
    credits: int | None = Field(default=None, ge=0, le=30)
    lecture_hours: float | None = Field(default=None, ge=0)
    tutorial_hours: float | None = Field(default=None, ge=0)
    practical_hours: float | None = Field(default=None, ge=0)
    department_id: uuid.UUID | None = None
    syllabus_url: str | None = Field(default=None, max_length=500)
    extra_data: dict | None = None


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    credits: int
    lecture_hours: float | None
    tutorial_hours: float | None
    practical_hours: float | None
    department_id: uuid.UUID | None
    syllabus_url: str | None
    extra_data: dict | None
    created_at: datetime
    updated_at: datetime


class CourseLite(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    credits: int
    lecture_hours: float | None
    tutorial_hours: float | None
    practical_hours: float | None


class PrerequisiteCreate(BaseModel):
    prerequisite_id: uuid.UUID
    type: str | None = Field(default=None, pattern="^(hard|soft|corequisite)$")


class PrerequisiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: uuid.UUID
    prerequisite_id: uuid.UUID
    type: str | None
