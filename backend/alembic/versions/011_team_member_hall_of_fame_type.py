"""allow 'hall_of_fame' as a team_members.type

Revision ID: 011
Revises: fc877c918349
Create Date: 2026-08-03

Past academic secretaries are rendered from team_members rows whose type the
frontend maps to its Hall of Fame section. The check constraint permitted no
such value, so the section always fell back to placeholder cards.

Mirrors the drop/recreate pattern used for this constraint in 008 step 4.

"""
from typing import Sequence, Union

from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "fc877c918349"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OLD = "type IN ('council', 'faculty', 'secretary', 'support')"
_NEW = "type IN ('council', 'faculty', 'secretary', 'support', 'hall_of_fame')"


def upgrade() -> None:
    op.drop_constraint("ck_team_member_type", "team_members", type_="check")
    op.create_check_constraint("ck_team_member_type", "team_members", _NEW)


def downgrade() -> None:
    # Rows added under the widened constraint violate the old one. Refuse rather
    # than delete them silently — reassign or remove them by hand first.
    rows = op.get_bind().exec_driver_sql(
        "SELECT count(*) FROM team_members WHERE type = 'hall_of_fame'"
    ).scalar()
    if rows:
        raise RuntimeError(
            f"{rows} team_members row(s) have type='hall_of_fame'. "
            "Reassign or delete them before downgrading."
        )
    op.drop_constraint("ck_team_member_type", "team_members", type_="check")
    op.create_check_constraint("ck_team_member_type", "team_members", _OLD)
