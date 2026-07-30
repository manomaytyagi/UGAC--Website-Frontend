"""Change lecture/tutorial/practical_hours from Integer to Float

Revision ID: 005
Revises: 004
Create Date: 2026-06-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("courses", "lecture_hours", type_=sa.Float(), existing_type=sa.Integer(), postgresql_using="lecture_hours::double precision")
    op.alter_column("courses", "tutorial_hours", type_=sa.Float(), existing_type=sa.Integer(), postgresql_using="tutorial_hours::double precision")
    op.alter_column("courses", "practical_hours", type_=sa.Float(), existing_type=sa.Integer(), postgresql_using="practical_hours::double precision")


def downgrade() -> None:
    op.alter_column("courses", "lecture_hours", type_=sa.Integer(), existing_type=sa.Float(), postgresql_using="lecture_hours::integer")
    op.alter_column("courses", "tutorial_hours", type_=sa.Integer(), existing_type=sa.Float(), postgresql_using="tutorial_hours::integer")
    op.alter_column("courses", "practical_hours", type_=sa.Integer(), existing_type=sa.Float(), postgresql_using="practical_hours::integer")
