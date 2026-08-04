from __future__ import annotations

import json
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, board_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.rooms[board_id].add(websocket)

    def disconnect(self, board_id: UUID, websocket: WebSocket) -> None:
        connections = self.rooms.get(board_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            del self.rooms[board_id]

    async def broadcast(self, board_id: UUID, event: str, payload: dict) -> None:
        message = json.dumps({"event": event, "payload": payload}, default=str)
        dead: list[WebSocket] = []
        for ws in list(self.rooms.get(board_id, set())):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(board_id, ws)


manager = ConnectionManager()
