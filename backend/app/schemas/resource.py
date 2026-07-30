import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResourceCreate(BaseModel):
    title: str = Field(max_length=300)
    category: str = Field(max_length=100)
    file_url: str = Field(max_length=500)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool = True


class ResourceUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    category: str | None = Field(default=None, max_length=100)
    file_url: str | None = Field(default=None, max_length=500)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class ResourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: str
    file_url: str
    academic_year: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
