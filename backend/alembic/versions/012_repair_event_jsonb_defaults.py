"""repair events.documents / events.tags rows holding a non-array JSONB value

Revision ID: 012
Revises: 011
Create Date: 2026-08-06

Both columns are NOT NULL with a server_default of "[]", but a default only
applies when the column is omitted from the INSERT. The admin panel's JSONField
submits an explicit value, so rows exist holding JSON null or a bare scalar.
EventRead then fails to serialise them and GET /events/ returns 500 for the whole
collection. See issue #18.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # jsonb_typeof() returns NULL for a SQL NULL and 'null' for a JSON null;
    # both are caught by IS DISTINCT FROM 'array'.
    op.execute(
        """
        UPDATE events
           SET documents = '[]'::jsonb
         WHERE jsonb_typeof(documents) IS DISTINCT FROM 'array'
        """
    )
    op.execute(
        """
        UPDATE events
           SET tags = '[]'::jsonb
         WHERE jsonb_typeof(tags) IS DISTINCT FROM 'array'
        """
    )
    # Drop non-conforming members from otherwise valid arrays: documents must be
    # objects, tags must be strings.
    op.execute(
        """
        UPDATE events
           SET documents = COALESCE(
                   (SELECT jsonb_agg(elem)
                      FROM jsonb_array_elements(documents) AS elem
                     WHERE jsonb_typeof(elem) = 'object'),
                   '[]'::jsonb)
         WHERE EXISTS (SELECT 1
                         FROM jsonb_array_elements(documents) AS elem
                        WHERE jsonb_typeof(elem) <> 'object')
        """
    )
    op.execute(
        """
        UPDATE events
           SET tags = COALESCE(
                   (SELECT jsonb_agg(elem)
                      FROM jsonb_array_elements(tags) AS elem
                     WHERE jsonb_typeof(elem) = 'string'),
                   '[]'::jsonb)
         WHERE EXISTS (SELECT 1
                         FROM jsonb_array_elements(tags) AS elem
                        WHERE jsonb_typeof(elem) <> 'string')
        """
    )


def downgrade() -> None:
    # Data repair — the prior values were unserialisable, so there is nothing to
    # restore.
    pass
