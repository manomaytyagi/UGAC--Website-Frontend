import uuid

from sqlalchemy import CheckConstraint, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Course(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "courses"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    lecture_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    tutorial_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    practical_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    syllabus_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    department = relationship("Department", back_populates="courses")
    reviews = relationship("CourseReview", back_populates="course")
    curriculum_entries = relationship("CurriculumCourse", back_populates="course")

    def __str__(self):
        return self.code

class CoursePrerequisite(Base):
    __tablename__ = "course_prerequisites"
    __table_args__ = (
        CheckConstraint("type IN ('hard', 'soft', 'corequisite')", name="ck_prerequisite_type"),
        CheckConstraint("course_id <> prerequisite_id", name="ck_course_prerequisites_not_self"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True
    )
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True
    )
    type: Mapped[str | None] = mapped_column(String(20), nullable=True)
