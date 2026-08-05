"""note lifecycle for proposals

Revision ID: 004_note_lifecycle
Revises: 003_completed_calendar
Create Date: 2026-08-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_note_lifecycle"
down_revision: Union[str, None] = "003_completed_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

note_lifecycle = postgresql.ENUM(
    "proposed",
    "accepted",
    "rejected",
    name="note_lifecycle",
    create_type=False,
)


def upgrade() -> None:
    note_lifecycle.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "notes",
        sa.Column(
            "lifecycle",
            note_lifecycle,
            nullable=False,
            server_default="accepted",
        ),
    )
    # Existing notes stay in the main list; new ones will be proposed by app default.
    op.execute("UPDATE notes SET lifecycle = 'accepted'")
    op.alter_column("notes", "lifecycle", server_default="proposed")


def downgrade() -> None:
    op.drop_column("notes", "lifecycle")
    note_lifecycle.drop(op.get_bind(), checkfirst=True)
