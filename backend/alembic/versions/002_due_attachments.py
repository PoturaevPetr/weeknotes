"""note due_at and attachments

Revision ID: 002_due_attachments
Revises: 001_initial
Create Date: 2026-08-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_due_attachments"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))

    attachment_kind = postgresql.ENUM("image", "video", name="attachment_kind", create_type=False)
    attachment_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "note_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", attachment_kind, nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("data_base64", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_note_attachments_note_id", "note_attachments", ["note_id"])


def downgrade() -> None:
    op.drop_index("ix_note_attachments_note_id", table_name="note_attachments")
    op.drop_table("note_attachments")
    op.execute("DROP TYPE IF EXISTS attachment_kind")
    op.drop_column("notes", "due_at")
