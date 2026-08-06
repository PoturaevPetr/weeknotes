from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class BoardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class BoardJoin(BaseModel):
    invite_code: str = Field(min_length=1, max_length=16)


class BoardMemberOut(BaseModel):
    id: uuid.UUID
    display_name: str

    model_config = {"from_attributes": True}


class BoardOut(BaseModel):
    id: uuid.UUID
    title: str
    invite_code: str
    owner_id: uuid.UUID
    created_at: datetime
    members: list[BoardMemberOut] = []

    model_config = {"from_attributes": True}


class AttachmentIn(BaseModel):
    kind: str = Field(pattern="^image$")
    mime_type: str = Field(default="", max_length=100)
    filename: str = Field(default="", max_length=255)
    data_base64: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize(self) -> "AttachmentIn":
        mime = (self.mime_type or "").lower().strip()
        name = (self.filename or "").strip()
        if not mime:
            mime = "image/jpeg"
        if not name:
            ext = "jpg"
            if "png" in mime:
                ext = "png"
            elif "webp" in mime:
                ext = "webp"
            elif "gif" in mime:
                ext = "gif"
            name = f"attachment.{ext}"
        self.kind = "image"
        self.mime_type = mime
        self.filename = name[:255]
        return self


class AttachmentsCreate(BaseModel):
    attachments: List[AttachmentIn] = Field(min_length=1, max_length=10)


class AttachmentMetaOut(BaseModel):
    id: uuid.UUID
    kind: str
    mime_type: str
    filename: str

    model_config = {"from_attributes": True}


class AttachmentOut(AttachmentMetaOut):
    data_base64: str


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    due_at: Optional[datetime] = None
    attachments: List[AttachmentIn] = Field(default_factory=list, max_length=10)


class NoteUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1, max_length=5000)
    status: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    due_at: Optional[datetime] = None


class AuthorOut(BaseModel):
    id: uuid.UUID
    display_name: str

    model_config = {"from_attributes": True}


class NoteOut(BaseModel):
    id: uuid.UUID
    board_id: uuid.UUID
    author: AuthorOut
    text: str
    status: str
    lifecycle: str = "accepted"
    latitude: Optional[float]
    longitude: Optional[float]
    due_at: Optional[datetime]
    completed_at: Optional[datetime] = None
    likes_count: int
    liked_by_me: bool
    comments_count: int = 0
    attachments: List[AttachmentMetaOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteDetailOut(NoteOut):
    attachments: List[AttachmentOut] = Field(default_factory=list)  # type: ignore[assignment]


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    author: AuthorOut
    text: str
    likes_count: int
    liked_by_me: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CalendarCoverOut(BaseModel):
    mime_type: str
    data_base64: str


class CalendarDayOut(BaseModel):
    date: str
    count: int
    cover: Optional[CalendarCoverOut] = None


class CalendarOut(BaseModel):
    days: List[CalendarDayOut]
