from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import CommentLike, Note, NoteComment, User
from app.routers.boards import require_membership
from app.routers.notes import load_note
from app.schemas import AuthorOut, CommentCreate, CommentOut
from app.ws import manager

router = APIRouter(tags=["comments"])


async def load_comment_likes(
    comment_ids: Sequence[UUID], user_id: UUID, db: AsyncSession
) -> dict[UUID, tuple[int, bool]]:
    """Like totals plus "mine" flags for many comments in one query."""
    ids = list(comment_ids)
    if not ids:
        return {}
    rows = await db.execute(
        select(
            CommentLike.comment_id,
            func.count().label("total"),
            func.count().filter(CommentLike.user_id == user_id).label("mine"),
        )
        .where(CommentLike.comment_id.in_(ids))
        .group_by(CommentLike.comment_id)
    )
    return {row.comment_id: (int(row.total), int(row.mine) > 0) for row in rows}


def comment_to_out(comment: NoteComment, likes_count: int, liked_by_me: bool) -> CommentOut:
    return CommentOut(
        id=comment.id,
        note_id=comment.note_id,
        author=AuthorOut.model_validate(comment.author),
        text=comment.text,
        likes_count=likes_count,
        liked_by_me=liked_by_me,
        created_at=comment.created_at,
    )


async def load_comment(comment_id: UUID, db: AsyncSession) -> NoteComment:
    result = await db.execute(
        select(NoteComment)
        .options(selectinload(NoteComment.author))
        .where(NoteComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


async def count_comments(note_id: UUID, db: AsyncSession) -> int:
    total = await db.scalar(
        select(func.count()).select_from(NoteComment).where(NoteComment.note_id == note_id)
    )
    return int(total or 0)


async def comment_access(comment_id: UUID, user: User, db: AsyncSession) -> tuple[NoteComment, Note]:
    comment = await load_comment(comment_id, db)
    note = await load_note(comment.note_id, db, with_attachments=False)
    await require_membership(note.board_id, user, db)
    return comment, note


async def broadcast_likes(comment: NoteComment, note: Note, event: str, db: AsyncSession) -> None:
    """Likes are per-user, so only the shared total travels over the socket."""
    total = await db.scalar(
        select(func.count()).select_from(CommentLike).where(CommentLike.comment_id == comment.id)
    )
    await manager.broadcast(
        note.board_id,
        event,
        {
            "note_id": str(note.id),
            "comment_id": str(comment.id),
            "likes_count": int(total or 0),
        },
    )


@router.get("/notes/{note_id}/comments", response_model=list[CommentOut])
async def list_comments(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CommentOut]:
    note = await load_note(note_id, db, with_attachments=False)
    await require_membership(note.board_id, user, db)
    result = await db.execute(
        select(NoteComment)
        .options(selectinload(NoteComment.author))
        .where(NoteComment.note_id == note_id)
        .order_by(NoteComment.created_at.asc(), NoteComment.id.asc())
    )
    comments = list(result.scalars().unique().all())
    likes = await load_comment_likes([c.id for c in comments], user.id, db)
    return [comment_to_out(c, *likes.get(c.id, (0, False))) for c in comments]


@router.post(
    "/notes/{note_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    note_id: UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    note = await load_note(note_id, db, with_attachments=False)
    await require_membership(note.board_id, user, db)

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment = NoteComment(note_id=note_id, author_id=user.id, text=text)
    db.add(comment)
    await db.commit()

    comment = await load_comment(comment.id, db)
    out = comment_to_out(comment, 0, False)
    await manager.broadcast(
        note.board_id,
        "comment.created",
        {
            "note_id": str(note_id),
            "comments_count": await count_comments(note_id, db),
            "comment": out.model_dump(mode="json"),
        },
    )
    return out


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_comment(
    comment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    comment, note = await comment_access(comment_id, user, db)
    if comment.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only author can delete comment",
        )
    await db.delete(comment)
    await db.commit()
    await manager.broadcast(
        note.board_id,
        "comment.deleted",
        {
            "note_id": str(note.id),
            "comment_id": str(comment_id),
            "comments_count": await count_comments(note.id, db),
        },
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/comments/{comment_id}/like", response_model=CommentOut)
async def like_comment(
    comment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    comment, note = await comment_access(comment_id, user, db)
    existing = await db.scalar(
        select(CommentLike.id).where(
            CommentLike.comment_id == comment_id, CommentLike.user_id == user.id
        )
    )
    if not existing:
        db.add(CommentLike(comment_id=comment_id, user_id=user.id))
        await db.commit()
    await broadcast_likes(comment, note, "comment.liked", db)
    likes = await load_comment_likes([comment_id], user.id, db)
    return comment_to_out(comment, *likes.get(comment_id, (0, False)))


@router.delete("/comments/{comment_id}/like", response_model=CommentOut)
async def unlike_comment(
    comment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    comment, note = await comment_access(comment_id, user, db)
    result = await db.execute(
        select(CommentLike).where(
            CommentLike.comment_id == comment_id, CommentLike.user_id == user.id
        )
    )
    like = result.scalar_one_or_none()
    if like:
        await db.delete(like)
        await db.commit()
    await broadcast_likes(comment, note, "comment.unliked", db)
    likes = await load_comment_likes([comment_id], user.id, db)
    return comment_to_out(comment, *likes.get(comment_id, (0, False)))
