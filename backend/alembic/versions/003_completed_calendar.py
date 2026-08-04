"""completed_at; drop video attachments

Revision ID: 003_completed_calendar
Revises: 002_due_attachments
Create Date: 2026-08-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_completed_calendar"
down_revision: Union[str, None] = "002_due_attachments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    # Remove video attachments entirely
    op.execute("DELETE FROM note_attachments WHERE kind = 'video'")


def downgrade() -> None:
    op.drop_column("notes", "completed_at")
