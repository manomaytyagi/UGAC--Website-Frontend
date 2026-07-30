from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TeamMember(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "team_members"
    __table_args__ = (
        CheckConstraint(
            "type IN ('council', 'faculty', 'secretary', 'support')", name="ck_team_member_type"
        ),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    portfolio: Mapped[str | None] = mapped_column(String(200), nullable=True)
    council_session: Mapped[str | None] = mapped_column(String(20), nullable=True)
    branch_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    batch_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    term_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    term_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)