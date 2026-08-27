import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Curriculum(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "curricula"

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    batch_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    branch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    specialization: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    total_credits: Mapped[int] = mapped_column(Integer, nullable=False)
    ic_compulsory_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icb_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dc_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    de_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fe_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hss_iks_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mtp_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    istp_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    research_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    branch = relationship("Branch", back_populates="curricula")
    curriculum_courses = relationship(
        "CurriculumCourse", back_populates="curriculum", cascade="all, delete-orphan"
    )
    elective_baskets = relationship(
        "ElectiveBasket", back_populates="curriculum", cascade="all, delete-orphan"
    )

    def __str__(self):
        return f"{self.name} ({self.batch_year})"


class CurriculumCourse(TimestampMixin, Base):
    __tablename__ = "curriculum_courses"
    __table_args__ = (
        CheckConstraint(
            "category IN ('IC','ICB','HSS','IKS','DC','DE','FE','MTP','ISTP','RESEARCH')",
            name="ck_curriculum_course_category",
        ),
        UniqueConstraint("curriculum_id", "course_id", name="uq_curriculum_courses_curriculum_course"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curriculum_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curricula.id", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pdf_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    basket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("elective_baskets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    curriculum = relationship("Curriculum", back_populates="curriculum_courses")
    course = relationship("Course", back_populates="curriculum_entries")
    basket = relationship("ElectiveBasket", back_populates="courses")


class ElectiveBasket(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "elective_baskets"

    curriculum_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curricula.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    min_credits: Mapped[int] = mapped_column(Integer, nullable=False)
    max_credits: Mapped[int] = mapped_column(Integer, nullable=False)
    semester: Mapped[int | None] = mapped_column(Integer, nullable=True)
    curriculum = relationship("Curriculum", back_populates="elective_baskets")
    courses = relationship("CurriculumCourse", back_populates="basket")
    