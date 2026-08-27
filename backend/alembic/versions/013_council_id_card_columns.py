"""add councillor ID-card columns to team_members

Revision ID: 013
Revises: 012
Create Date: 2026-08-22

Roll number, phone, Instagram handle and signature image are needed by the
councillor import script ("Councillor Data for ID Card" form responses) and
by ID-card generation. All nullable — only council rows carry them today.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("team_members", sa.Column("roll_number", sa.String(20), nullable=True))
    op.add_column("team_members", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("team_members", sa.Column("instagram", sa.String(200), nullable=True))
    op.add_column("team_members", sa.Column("signature_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("team_members", "signature_url")
    op.drop_column("team_members", "instagram")
    op.drop_column("team_members", "phone")
    op.drop_column("team_members", "roll_number")
