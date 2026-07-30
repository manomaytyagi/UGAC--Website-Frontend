import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(max_length=300)
    content: str
    category: str | None = Field(default=None, max_length=100)
    attachment_url: str | None = Field(default=None, max_length=500)
    published_at: datetime | None = None
    is_pinned: bool = False
    is_active: bool = True


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    content: str | None = None
    category: str | None = Field(default=None, max_length=100)
    attachment_url: str | None = Field(default=None, max_length=500)
    published_at: datetime | None = None
    is_pinned: bool | None = None
    is_active: bool | None = None


class AnnouncementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    category: str | None
    attachment_url: str | None
    published_at: datetime
    is_pinned: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
