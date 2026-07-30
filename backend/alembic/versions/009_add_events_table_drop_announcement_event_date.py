"""add events table, team_members.batch_year, drop announcements.event_date

Revision ID: 009
Revises: 008
Create Date: 2026-07-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------
    # STEP 1: create events table
    # -----------------------------------------------------------------
    op.create_table(
        "events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "event_date",
            sa.DateTime(timezone=True),
            nullable=False,
            index=True,
        ),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("banner_key", sa.String(length=500), nullable=True),
        sa.Column(
            "registration_url", sa.String(length=500), nullable=True
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "is_featured",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # -----------------------------------------------------------------
    # STEP 2: add team_members.batch_year
    # -----------------------------------------------------------------
    op.add_column(
        "team_members",
        sa.Column("batch_year", sa.Integer(), nullable=True),
    )

    # -----------------------------------------------------------------
    # STEP 3: drop announcements.event_date
    # -----------------------------------------------------------------
    op.drop_column("announcements", "event_date")


def downgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column(
            "event_date",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )

    op.drop_column("team_members", "batch_year")

    op.drop_table("events")
