import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TeamMemberCreate(BaseModel):
    name: str = Field(max_length=200)
    role: str = Field(max_length=200)
    type: str = Field(max_length=30, pattern="^(council|faculty|secretary|support|hall_of_fame)$")
    email: str | None = Field(default=None, max_length=200)
    photo_url: str | None = Field(default=None, max_length=500)
    bio: str | None = None
    linkedin_url: str | None = Field(default=None, max_length=500)
    portfolio: str | None = Field(default=None, max_length=200)
    council_session: str | None = Field(default=None, max_length=20)
    branch_code: str | None = Field(default=None, max_length=20)
    batch_year: int | None = Field(default=None, ge=2000, le=2100)
    roll_number: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    instagram: str | None = Field(default=None, max_length=200)
    signature_url: str | None = Field(default=None, max_length=500)
    team_name: str | None = Field(default=None, max_length=200)
    term_start: date | None = None
    term_end: date | None = None
    order: int = 0
    is_active: bool = True
    is_featured: bool = False


class TeamMemberUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, max_length=200)
    type: str | None = Field(default=None, max_length=30, pattern="^(council|faculty|secretary|support|hall_of_fame)$")
    email: str | None = Field(default=None, max_length=200)
    photo_url: str | None = Field(default=None, max_length=500)
    bio: str | None = None
    linkedin_url: str | None = Field(default=None, max_length=500)
    portfolio: str | None = Field(default=None, max_length=200)
    council_session: str | None = Field(default=None, max_length=20)
    branch_code: str | None = Field(default=None, max_length=20)
    batch_year: int | None = Field(default=None, ge=2000, le=2100)
    roll_number: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    instagram: str | None = Field(default=None, max_length=200)
    signature_url: str | None = Field(default=None, max_length=500)
    team_name: str | None = Field(default=None, max_length=200)
    term_start: date | None = None
    term_end: date | None = None
    order: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    role: str
    type: str
    email: str | None
    photo_url: str | None
    bio: str | None
    linkedin_url: str | None
    portfolio: str | None
    council_session: str | None
    branch_code: str | None
    batch_year: int | None
    team_name: str | None
    term_start: date | None
    term_end: date | None
    order: int
    is_active: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime
