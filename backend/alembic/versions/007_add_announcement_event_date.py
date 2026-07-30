"""add event_date to announcements

Revision ID: 007
Revises: 006
Create Date: 2026-06-21

"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("event_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("announcements", "event_date")
