"""align schema with final DB_SCHEMA_AND_DATA_ENTRY_GUIDE

Revision ID: 008
Revises: 007
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------
    # STEP 1: curricula.ic_credits -> ic_compulsory_credits (rename)
    # -----------------------------------------------------------------
    op.alter_column(
        "curricula",
        "ic_credits",
        new_column_name="ic_compulsory_credits",
    )

    # -----------------------------------------------------------------
    # STEP 2: curricula.research_credits (new column, used by BS branch)
    # -----------------------------------------------------------------
    op.add_column(
        "curricula",
        sa.Column(
            "research_credits",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # -----------------------------------------------------------------
    # STEP 3: team_members.branch_code (new column — confirmed absent),
    # team_members.team_name, team_members.is_featured
    # -----------------------------------------------------------------
    op.add_column(
        "team_members",
        sa.Column("branch_code", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "team_members",
        sa.Column("team_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "team_members",
        sa.Column(
            "is_featured",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # -----------------------------------------------------------------
    # STEP 4: team_members.type CHECK -> allow 'support'
    # Constraint confirmed named ck_team_member_type (from bdc6d0fd7375)
    # -----------------------------------------------------------------
    op.drop_constraint("ck_team_member_type", "team_members", type_="check")
    op.create_check_constraint(
        "ck_team_member_type",
        "team_members",
        "type IN ('council', 'faculty', 'secretary', 'support')",
    )

    # -----------------------------------------------------------------
    # STEP 5: curriculum_courses.category CHECK -> add ICB, RESEARCH
    # Constraint confirmed named ck_curriculum_course_category
    # -----------------------------------------------------------------
    op.drop_constraint(
        "ck_curriculum_course_category", "curriculum_courses", type_="check"
    )
    op.create_check_constraint(
        "ck_curriculum_course_category",
        "curriculum_courses",
        "category IN ('IC','ICB','HSS','IKS','DC','DE','FE','MTP','ISTP','RESEARCH')",
    )

    # -----------------------------------------------------------------
    # STEP 6: curriculum_courses UNIQUE (curriculum_id, course_id)
    # Table confirmed empty (0 rows) — safe, no dedupe needed.
    # -----------------------------------------------------------------
    op.create_unique_constraint(
        "uq_curriculum_courses_curriculum_course",
        "curriculum_courses",
        ["curriculum_id", "course_id"],
    )

    # -----------------------------------------------------------------
    # STEP 7: faculty.email UNIQUE
    # Confirmed: no existing unique constraint, indexed only.
    # If you ran the dedupe-check query and got rows back, STOP and
    # resolve duplicates before running this migration.
    # -----------------------------------------------------------------
    op.create_unique_constraint(
        "uq_faculty_email", "faculty", ["email"]
    )

    # -----------------------------------------------------------------
    # STEP 8: course_prerequisites CHECK (course_id <> prerequisite_id)
    # Named distinctly from existing ck_prerequisite_type.
    # Table confirmed empty (0 rows) — safe.
    # -----------------------------------------------------------------
    op.create_check_constraint(
        "ck_course_prerequisites_not_self",
        "course_prerequisites",
        "course_id <> prerequisite_id",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_course_prerequisites_not_self", "course_prerequisites", type_="check"
    )
    op.drop_constraint("uq_faculty_email", "faculty", type_="unique")
    op.drop_constraint(
        "uq_curriculum_courses_curriculum_course",
        "curriculum_courses",
        type_="unique",
    )

    op.drop_constraint(
        "ck_curriculum_course_category", "curriculum_courses", type_="check"
    )
    op.create_check_constraint(
        "ck_curriculum_course_category",
        "curriculum_courses",
        "category IN ('IC', 'DC', 'DE', 'FE', 'HSS', 'IKS', 'MTP', 'ISTP')",
    )

    op.drop_constraint("ck_team_member_type", "team_members", type_="check")
    op.create_check_constraint(
        "ck_team_member_type",
        "team_members",
        "type IN ('council', 'faculty', 'secretary')",
    )

    op.drop_column("team_members", "is_featured")
    op.drop_column("team_members", "team_name")
    op.drop_column("team_members", "branch_code")

    op.drop_column("curricula", "research_credits")

    op.alter_column(
        "curricula",
        "ic_compulsory_credits",
        new_column_name="ic_credits",
    )