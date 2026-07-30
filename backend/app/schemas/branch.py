import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    code: str = Field(max_length=20)
    name: str = Field(max_length=200)
    department_id: uuid.UUID
    degree_type: str = Field(max_length=20)
    is_active: bool = True


class BranchUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=20)
    name: str | None = Field(default=None, max_length=200)
    department_id: uuid.UUID | None = None
    degree_type: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class BranchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    department_id: uuid.UUID
    degree_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
