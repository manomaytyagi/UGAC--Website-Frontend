"""v2 schema — branches, faculty, offerings, announcements, resources

Revision ID: 003
Revises: bdc6d0fd7375
Create Date: 2026-06-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "bdc6d0fd7375"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- branches ---
    op.create_table(
        "branches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("degree_type", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- faculty ---
    op.create_table(
        "faculty",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(200), nullable=False, index=True),
        sa.Column("designation", sa.String(200), nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("office_location", sa.String(200), nullable=True),
        sa.Column("linkedin_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- course_offerings ---
    op.create_table(
        "course_offerings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("semester", sa.Integer, nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("instructor", sa.String(200), nullable=True),
        sa.Column("slots", sa.String(50), nullable=True),
        sa.Column("max_strength", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.true(), nullable=False),
    )

    # --- announcements ---
    op.create_table(
        "announcements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("attachment_url", sa.String(500), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_pinned", sa.Boolean, server_default=sa.false(), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- resources ---
    op.create_table(
        "resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, index=True),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("academic_year", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- curricula: department_id → branch_id ---
    op.drop_constraint("curricula_department_id_fkey", "curricula", type_="foreignkey")
    op.drop_index("ix_curricula_department_id", table_name="curricula")
    op.alter_column("curricula", "department_id", new_column_name="branch_id")
    op.create_index("ix_curricula_branch_id", "curricula", ["branch_id"])
    op.create_foreign_key(None, "curricula", "branches", ["branch_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("curricula_branch_id_fkey", "curricula", type_="foreignkey")
    op.drop_index("ix_curricula_branch_id", table_name="curricula")
    op.alter_column("curricula", "branch_id", new_column_name="department_id")
    op.create_index("ix_curricula_department_id", "curricula", ["department_id"])
    op.create_foreign_key(None, "curricula", "departments", ["department_id"], ["id"], ondelete="SET NULL")

    op.drop_table("resources")
    op.drop_table("announcements")
    op.drop_table("course_offerings")
    op.drop_table("faculty")
    op.drop_table("branches")
