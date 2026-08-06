from __future__ import annotations

import base64
import binascii
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import AttachmentKind, Like, Note, NoteAttachment, NoteLifecycle, NoteStatus, User
from app.routers.boards import require_membership
from app.schemas import (
    AttachmentIn,
    AttachmentMetaOut,
    AttachmentOut,
    AttachmentsCreate,
    AuthorOut,
    CalendarCoverOut,
    CalendarDayOut,
    CalendarOut,
    NoteCreate,
    NoteDetailOut,
    NoteOut,
    NoteUpdate,
)
from app.ws import manager

router = APIRouter(tags=["notes"])

MAX_ATTACHMENTS = 10
MAX_IMAGE_BYTES = 15 * 1024 * 1024
ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _strip_data_url(data: str) -> str:
    if "," in data and data.startswith("data:"):
        return data.split(",", 1)[1]
    return data


def _validate_attachment(item: AttachmentIn) -> tuple[AttachmentKind, str, int]:
    if item.kind != "image":
        raise HTTPException(status_code=400, detail="Only image attachments are allowed")
    mime = item.mime_type.lower().strip()
    if mime == "image/jpg":
        mime = "image/jpeg"
    raw = _strip_data_url(item.data_base64.strip())
    try:
        decoded = base64.b64decode(raw, validate=True)
    except binascii.Error as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 for {item.filename}") from exc

    size = len(decoded)
    if mime not in ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {mime}")
    if size > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 15MB)")

    return AttachmentKind.image, raw, size


def _image_attachments(note: Note) -> list[NoteAttachment]:
    return [
        a
        for a in (note.attachments or [])
        if (a.kind.value if isinstance(a.kind, AttachmentKind) else a.kind) == "image"
    ]


def _meta_attachments(note: Note) -> list[AttachmentMetaOut]:
    return [
        AttachmentMetaOut(
            id=a.id,
            kind="image",
            mime_type=a.mime_type,
            filename=a.filename,
        )
        for a in _image_attachments(note)
    ]


def _full_attachments(note: Note) -> list[AttachmentOut]:
    return [
        AttachmentOut(
            id=a.id,
            kind="image",
            mime_type=a.mime_type,
            filename=a.filename,
            data_base64=a.data_base64,
        )
        for a in _image_attachments(note)
    ]


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def note_to_out(note: Note, user_id: UUID, db: AsyncSession) -> NoteOut:
    likes_count = await db.scalar(select(func.count()).select_from(Like).where(Like.note_id == note.id))
    liked = await db.scalar(select(Like.id).where(Like.note_id == note.id, Like.user_id == user_id))
    return NoteOut(
        id=note.id,
        board_id=note.board_id,
        author=AuthorOut.model_validate(note.author),
        text=note.text,
        status=note.status.value if isinstance(note.status, NoteStatus) else note.status,
        lifecycle=note.lifecycle.value if isinstance(note.lifecycle, NoteLifecycle) else note.lifecycle,
        latitude=note.latitude,
        longitude=note.longitude,
        due_at=note.due_at,
        completed_at=note.completed_at,
        likes_count=int(likes_count or 0),
        liked_by_me=liked is not None,
        attachments=_meta_attachments(note),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


async def note_to_detail(note: Note, user_id: UUID, db: AsyncSession) -> NoteDetailOut:
    base = await note_to_out(note, user_id, db)
    payload = base.model_dump()
    payload["attachments"] = [a.model_dump() for a in _full_attachments(note)]
    return NoteDetailOut.model_validate(payload)


async def load_note(note_id: UUID, db: AsyncSession, *, with_attachments: bool = True) -> Note:
    options = [selectinload(Note.author)]
    if with_attachments:
        options.append(selectinload(Note.attachments))
    result = await db.execute(select(Note).options(*options).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.get("/boards/{board_id}/notes", response_model=list[NoteOut])
async def list_notes(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NoteOut]:
    await require_membership(board_id, user, db)
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.author), selectinload(Note.attachments))
        .where(
            Note.board_id == board_id,
            Note.lifecycle.in_([NoteLifecycle.proposed, NoteLifecycle.accepted]),
        )
        .order_by(Note.created_at.desc())
    )
    notes = result.scalars().unique().all()
    return [await note_to_out(n, user.id, db) for n in notes]


@router.get("/boards/{board_id}/calendar", response_model=CalendarOut)
async def board_calendar(
    board_id: UUID,
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    tz_offset: int = Query(
        0,
        ge=-14 * 60,
        le=14 * 60,
        description="JS Date#getTimezoneOffset() — minutes (UTC - local)",
    ),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarOut:
    await require_membership(board_id, user, db)
    if to_date < from_date:
        raise HTTPException(status_code=400, detail="'to' must be >= 'from'")
    if (to_date - from_date).days > 370:
        raise HTTPException(status_code=400, detail="Date range too large")

    from datetime import timedelta

    offset = timedelta(minutes=tz_offset)

    def local_day(dt: datetime) -> date:
        # Match JS: local = utc - getTimezoneOffset minutes
        return (_as_utc(dt) - offset).date()

    result = await db.execute(
        select(Note)
        .options(selectinload(Note.attachments))
        .where(Note.board_id == board_id, Note.lifecycle == NoteLifecycle.accepted)
    )
    notes = list(result.scalars().unique().all())

    by_day: dict[date, set[UUID]] = {}
    notes_by_id = {n.id: n for n in notes}

    for note in notes:
        keys: set[date] = {local_day(note.created_at)}
        if note.due_at:
            keys.add(local_day(note.due_at))
        if note.completed_at:
            keys.add(local_day(note.completed_at))
        for key in keys:
            if from_date <= key <= to_date:
                by_day.setdefault(key, set()).add(note.id)

    def cover_for_day(day: date, day_notes: list[Note]) -> CalendarCoverOut | None:
        completed: list[Note] = []
        due: list[Note] = []
        created: list[Note] = []
        for n in day_notes:
            if n.completed_at and local_day(n.completed_at) == day:
                completed.append(n)
            if n.due_at and local_day(n.due_at) == day:
                due.append(n)
            if local_day(n.created_at) == day:
                created.append(n)
        for group in (completed, due, created):
            for note in sorted(group, key=lambda n: _as_utc(n.created_at)):
                images = sorted(_image_attachments(note), key=lambda a: _as_utc(a.created_at))
                if images:
                    a = images[0]
                    return CalendarCoverOut(mime_type=a.mime_type, data_base64=a.data_base64)
        return None

    days: list[CalendarDayOut] = []
    for day in sorted(by_day.keys()):
        ids = by_day[day]
        day_notes = [notes_by_id[i] for i in ids]
        days.append(
            CalendarDayOut(
                date=day.isoformat(),
                count=len(ids),
                cover=cover_for_day(day, day_notes),
            )
        )
    return CalendarOut(days=days)


@router.post("/boards/{board_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    board_id: UUID,
    body: NoteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    await require_membership(board_id, user, db)
    if (body.latitude is None) != (body.longitude is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="latitude and longitude must both be set or both omitted",
        )
    if len(body.attachments) > MAX_ATTACHMENTS:
        raise HTTPException(status_code=400, detail="Too many attachments")

    due_at = body.due_at
    if due_at is not None and due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=timezone.utc)

    note = Note(
        board_id=board_id,
        author_id=user.id,
        text=body.text.strip(),
        latitude=body.latitude,
        longitude=body.longitude,
        due_at=due_at,
        lifecycle=NoteLifecycle.proposed,
    )
    db.add(note)
    await db.flush()

    for item in body.attachments:
        kind, raw, _size = _validate_attachment(item)
        db.add(
            NoteAttachment(
                note_id=note.id,
                kind=kind,
                mime_type=item.mime_type.lower().strip(),
                filename=item.filename.strip()[:255],
                data_base64=raw,
            )
        )

    await db.commit()
    note = await load_note(note.id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(board_id, "note.created", out.model_dump(mode="json"))
    return out


@router.get("/notes/{note_id}", response_model=NoteDetailOut)
async def get_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetailOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    return await note_to_detail(note, user.id, db)


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: UUID,
    body: NoteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)

    data = body.model_dump(exclude_unset=True)
    author_only = {"text", "due_at", "latitude", "longitude"}
    if author_only & data.keys() and note.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only author can edit note content",
        )

    if "status" in data and data["status"] is not None:
        try:
            new_status = NoteStatus(data["status"])
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="status must be open or done") from exc
        prev = note.status
        note.status = new_status
        if new_status == NoteStatus.done and prev != NoteStatus.done:
            note.completed_at = datetime.now(timezone.utc)
        elif new_status == NoteStatus.open:
            note.completed_at = None

    if "text" in data and data["text"] is not None:
        note.text = data["text"].strip()
    if "due_at" in data:
        due_at = data["due_at"]
        if isinstance(due_at, datetime) and due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        note.due_at = due_at
    if "latitude" in data or "longitude" in data:
        lat = data.get("latitude", note.latitude)
        lng = data.get("longitude", note.longitude)
        if (lat is None) != (lng is None):
            raise HTTPException(
                status_code=400,
                detail="latitude and longitude must both be set or both omitted",
            )
        note.latitude = lat
        note.longitude = lng

    await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.updated", out.model_dump(mode="json"))
    return out


@router.post("/notes/{note_id}/accept", response_model=NoteOut)
async def accept_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    if note.lifecycle != NoteLifecycle.proposed:
        raise HTTPException(status_code=400, detail="Only proposed notes can be accepted")
    if note.author_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Author cannot accept their own proposal",
        )
    note.lifecycle = NoteLifecycle.accepted
    await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.updated", out.model_dump(mode="json"))
    return out


@router.post("/notes/{note_id}/reject", response_model=NoteOut)
async def reject_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    if note.lifecycle != NoteLifecycle.proposed:
        raise HTTPException(status_code=400, detail="Only proposed notes can be rejected")
    if note.author_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Author cannot reject their own proposal",
        )
    note.lifecycle = NoteLifecycle.rejected
    await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.updated", out.model_dump(mode="json"))
    return out


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    if note.author_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can delete")
    board_id = note.board_id
    payload = {"id": str(note.id)}
    await db.delete(note)
    await db.commit()
    await manager.broadcast(board_id, "note.deleted", payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notes/{note_id}/attachments", response_model=NoteDetailOut, status_code=status.HTTP_201_CREATED)
async def add_attachments(
    note_id: UUID,
    body: AttachmentsCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetailOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    if note.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only author can add attachments",
        )
    current = len(_image_attachments(note))
    if current + len(body.attachments) > MAX_ATTACHMENTS:
        raise HTTPException(status_code=400, detail="Too many attachments")
    for item in body.attachments:
        kind, raw, _size = _validate_attachment(item)
        db.add(
            NoteAttachment(
                note_id=note.id,
                kind=kind,
                mime_type=item.mime_type.lower().strip(),
                filename=item.filename.strip()[:255],
                data_base64=raw,
            )
        )
    await db.commit()
    note = await load_note(note_id, db)
    out_meta = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.updated", out_meta.model_dump(mode="json"))
    return await note_to_detail(note, user.id, db)


@router.delete(
    "/notes/{note_id}/attachments/{attachment_id}",
    response_model=NoteOut,
)
async def delete_attachment(
    note_id: UUID,
    attachment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    if note.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only author can delete attachments",
        )
    attachment = next((a for a in (note.attachments or []) if a.id == attachment_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    await db.delete(attachment)
    await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.updated", out.model_dump(mode="json"))
    return out


@router.post("/notes/{note_id}/like", response_model=NoteOut)
async def like_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    existing = await db.scalar(select(Like.id).where(Like.note_id == note.id, Like.user_id == user.id))
    if not existing:
        db.add(Like(note_id=note.id, user_id=user.id))
        await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.liked", out.model_dump(mode="json"))
    return out


@router.delete("/notes/{note_id}/like", response_model=NoteOut)
async def unlike_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteOut:
    note = await load_note(note_id, db)
    await require_membership(note.board_id, user, db)
    result = await db.execute(select(Like).where(Like.note_id == note.id, Like.user_id == user.id))
    like = result.scalar_one_or_none()
    if like:
        await db.delete(like)
        await db.commit()
    note = await load_note(note_id, db)
    out = await note_to_out(note, user.id, db)
    await manager.broadcast(note.board_id, "note.unliked", out.model_dump(mode="json"))
    return out
