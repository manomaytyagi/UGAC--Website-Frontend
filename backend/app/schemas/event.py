import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EventCreate(BaseModel):
    title: str = Field(max_length=300)
    description: str | None = None
    event_date: datetime
    end_date: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    banner_key: str | None = Field(default=None, max_length=500)
    registration_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    is_featured: bool = False
    audience: str | None = Field(default=None, max_length=200)
    report_key: str | None = Field(default=None, max_length=500)
    youtube_url: str | None = Field(default=None, max_length=500)
    canva_url: str | None = Field(default=None, max_length=500)
    documents: list[dict] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    event_date: datetime | None = None
    end_date: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    banner_key: str | None = Field(default=None, max_length=500)
    registration_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    is_featured: bool | None = None
    audience: str | None = Field(default=None, max_length=200)
    report_key: str | None = Field(default=None, max_length=500)
    youtube_url: str | None = Field(default=None, max_length=500)
    canva_url: str | None = Field(default=None, max_length=500)
    documents: list[dict] | None = None
    tags: list[str] | None = None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    description: str | None

    # aliased fields — backend column name via validation_alias,
    # frontend-facing key via serialization_alias
    date: datetime = Field(validation_alias="event_date", serialization_alias="date")
    image_key: str | None = Field(validation_alias="banner_key", serialization_alias="image_key")

    end_date: datetime | None
    location: str | None
    registration_url: str | None
    is_active: bool
    is_featured: bool
    audience: str | None
    report_key: str | None
    youtube_url: str | None
    canva_url: str | None
    documents: list[dict]
    tags: list[str]
    created_at: datetime
    updated_at: datetime