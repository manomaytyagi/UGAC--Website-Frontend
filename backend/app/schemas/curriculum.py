import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.branch import BranchRead


class CurriculumCreate(BaseModel):
    name: str = Field(max_length=300)
    batch_year: int = Field(ge=2000, le=2100)
    branch_id: uuid.UUID | None = None
    total_credits: int = Field(ge=0)
    specialization: str | None = Field(default=None, max_length=200)
    ic_compulsory_credits: int = 0
    icb_credits: int = 0
    dc_credits: int = 0
    de_credits: int = 0
    fe_credits: int = 0
    hss_iks_credits: int = 0
    mtp_credits: int = 0
    istp_credits: int = 0
    research_credits: int = 0
    extra_data: dict | None = None


class CurriculumUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=300)
    batch_year: int | None = Field(default=None, ge=2000, le=2100)
    branch_id: uuid.UUID | None = None
    total_credits: int | None = Field(default=None, ge=0)
    specialization: str | None = Field(default=None, max_length=200)
    ic_compulsory_credits: int | None = None
    icb_credits: int | None = None
    dc_credits: int | None = None
    de_credits: int | None = None
    fe_credits: int | None = None
    hss_iks_credits: int | None = None
    mtp_credits: int | None = None
    istp_credits: int | None = None
    research_credits: int | None = None
    extra_data: dict | None = None


class CurriculumRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    name: str
    batch_year: int
    branch_id: uuid.UUID | None
    branch: BranchRead | None = None
    total_credits: int
    specialization: str | None
    ic_credits: int = Field(validation_alias="ic_compulsory_credits", serialization_alias="ic_credits")
    icb_credits: int
    dc_credits: int
    de_credits: int
    fe_credits: int
    hss_iks_credits: int
    mtp_credits: int
    istp_credits: int
    research_credits: int
    extra_data: dict | None
    created_at: datetime
    updated_at: datetime


class CurriculumCourseCreate(BaseModel):
    course_id: uuid.UUID
    semester: int = Field(ge=1, le=12)
    category: str | None = Field(default=None, max_length=50)
    is_optional: bool = False
    basket_id: uuid.UUID | None = None
    pdf_link: str | None = None


class CurriculumCourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    curriculum_id: uuid.UUID
    course_id: uuid.UUID
    semester: int
    category: str | None
    is_optional: bool
    basket_id: uuid.UUID | None
    pdf_link: str | None = None
    created_at: datetime
    updated_at: datetime


class ElectiveBasketCreate(BaseModel):
    name: str = Field(max_length=200)
    min_credits: int = Field(ge=0)
    max_credits: int = Field(ge=0)
    semester: int | None = Field(default=None, ge=1, le=12)


class ElectiveBasketUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    min_credits: int | None = Field(default=None, ge=0)
    max_credits: int | None = Field(default=None, ge=0)
    semester: int | None = Field(default=None, ge=1, le=12)


class ElectiveBasketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    curriculum_id: uuid.UUID
    name: str
    min_credits: int
    max_credits: int
    semester: int | None
    created_at: datetime
    updated_at: datetime
