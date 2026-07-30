from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Department(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    branches = relationship("Branch", back_populates="department", passive_deletes=True)
    courses = relationship("Course", back_populates="department", passive_deletes=True)
    faculty = relationship("Faculty", back_populates="department", passive_deletes=True)

    def __str__(self) -> str:
        """Use a meaningful label for SQLAdmin relationship selectors."""
        return self.name
