import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseReviewCreate(BaseModel):
    course_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    review_text: str
    semester_taken: str | None = Field(default=None, max_length=20)
    h_captcha_token: str


class CourseReviewModerate(BaseModel):
    status: str = Field(pattern="^(approved|rejected|pending)$")
    moderated_by: str | None = Field(default=None, max_length=100)


class CourseReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    rating: int
    review_text: str
    semester_taken: str | None
    status: str
    moderated_by: str | None
    created_at: datetime
    updated_at: datetime