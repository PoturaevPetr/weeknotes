from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Board, BoardMember, MemberRole, User
from app.schemas import BoardCreate, BoardJoin, BoardMemberOut, BoardOut

router = APIRouter(prefix="/boards", tags=["boards"])

_members_load = selectinload(Board.members).selectinload(BoardMember.user)


def serialize_board(board: Board) -> BoardOut:
    members = [
        BoardMemberOut(id=m.user.id, display_name=m.user.display_name)
        for m in board.members
        if m.user is not None
    ]
    return BoardOut(
        id=board.id,
        title=board.title,
        invite_code=board.invite_code,
        owner_id=board.owner_id,
        created_at=board.created_at,
        members=members,
    )


async def require_membership(board_id: UUID, user: User, db: AsyncSession) -> Board:
    result = await db.execute(
        select(Board).options(_members_load).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    if not any(m.user_id == user.id for m in board.members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a board member")
    return board


@router.post("", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
async def create_board(
    body: BoardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardOut:
    board = Board(title=body.title.strip(), owner_id=user.id)
    db.add(board)
    await db.flush()
    db.add(BoardMember(board_id=board.id, user_id=user.id, role=MemberRole.owner))
    await db.commit()
    result = await db.execute(select(Board).options(_members_load).where(Board.id == board.id))
    board = result.scalar_one()
    return serialize_board(board)


@router.get("", response_model=list[BoardOut])
async def list_boards(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BoardOut]:
    result = await db.execute(
        select(Board)
        .options(_members_load)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .where(BoardMember.user_id == user.id)
        .order_by(Board.created_at.desc())
    )
    boards = result.scalars().unique().all()
    return [serialize_board(b) for b in boards]


@router.post("/join", response_model=BoardOut)
async def join_board(
    body: BoardJoin,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardOut:
    result = await db.execute(
        select(Board)
        .options(_members_load)
        .where(Board.invite_code == body.invite_code.strip())
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")
    if not any(m.user_id == user.id for m in board.members):
        db.add(BoardMember(board_id=board.id, user_id=user.id, role=MemberRole.member))
        await db.commit()
        result = await db.execute(select(Board).options(_members_load).where(Board.id == board.id))
        board = result.scalar_one()
    return serialize_board(board)


@router.get("/{board_id}", response_model=BoardOut)
async def get_board(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardOut:
    board = await require_membership(board_id, user, db)
    return serialize_board(board)
