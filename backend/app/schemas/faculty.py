import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FacultyCreate(BaseModel):
    name: str = Field(max_length=200)
    email: str = Field(max_length=200)
    designation: str | None = Field(default=None, max_length=200)
    department_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    batch_year: int | None = Field(default=None, ge=2000, le=2100)
    photo_url: str | None = Field(default=None, max_length=500)
    office_location: str | None = Field(default=None, max_length=200)
    linkedin_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class FacultyUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    designation: str | None = Field(default=None, max_length=200)
    department_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    batch_year: int | None = Field(default=None, ge=2000, le=2100)
    photo_url: str | None = Field(default=None, max_length=500)
    office_location: str | None = Field(default=None, max_length=200)
    linkedin_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class FacultyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    designation: str | None
    department_id: uuid.UUID | None
    branch_id: uuid.UUID | None
    batch_year: int | None
    photo_url: str | None
    office_location: str | None
    linkedin_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
