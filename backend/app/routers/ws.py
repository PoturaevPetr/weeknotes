from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth import get_user_from_token
from app.database import AsyncSessionLocal
from app.routers.boards import require_membership
from app.ws import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/boards/{board_id}")
async def board_ws(
    websocket: WebSocket,
    board_id: UUID,
    token: str = Query(...),
) -> None:
    async with AsyncSessionLocal() as db:
        try:
            user = await get_user_from_token(token, db)
            await require_membership(board_id, user, db)
        except Exception:
            await websocket.close(code=4401)
            return

    await manager.connect(board_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(board_id, websocket)
