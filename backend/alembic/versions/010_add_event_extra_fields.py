"""add event extra fields: audience, report_key, youtube_url, canva_url, documents, tags

Revision ID: 010
Revises: 009
Create Date: 2026-07-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("audience", sa.String(length=200), nullable=True))
    op.add_column("events", sa.Column("report_key", sa.String(length=500), nullable=True))
    op.add_column("events", sa.Column("youtube_url", sa.String(length=500), nullable=True))
    op.add_column("events", sa.Column("canva_url", sa.String(length=500), nullable=True))
    op.add_column(
        "events",
        sa.Column(
            "documents",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "events",
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "tags")
    op.drop_column("events", "documents")
    op.drop_column("events", "canva_url")
    op.drop_column("events", "youtube_url")
    op.drop_column("events", "report_key")
    op.drop_column("events", "audience")