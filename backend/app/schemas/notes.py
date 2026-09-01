"""
NexusNotes — Pydantic Schemas: Notes, Folders, Tags
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# Tag Schemas
# ──────────────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class TagResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────────────────
# Folder Schemas
# ──────────────────────────────────────────────────────────────────────────────

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: int | None = None


class FolderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    parent_id: int | None = None


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None
    created_at: datetime
    updated_at: datetime
    # Recursive children for tree view
    children: list["FolderResponse"] = []

    model_config = {"from_attributes": True}


FolderResponse.model_rebuild()


# ──────────────────────────────────────────────────────────────────────────────
# Note Schemas
# ──────────────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=500)
    content: str = Field(default="")
    folder_id: int | None = None
    tag_ids: list[int] = []


class NoteUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    content: str | None = None
    folder_id: int | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    tag_ids: list[int] | None = None


class NoteSummary(BaseModel):
    """Lightweight note representation for list views — no full content."""
    id: int
    title: str
    slug: str
    excerpt: str | None
    folder_id: int | None
    is_favorite: bool
    is_archived: bool
    is_deleted: bool
    tags: list[TagResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteDetail(BaseModel):
    """Full note with content — used when opening a specific note."""
    id: int
    title: str
    slug: str
    content: str
    excerpt: str | None
    folder_id: int | None
    is_favorite: bool
    is_archived: bool
    is_deleted: bool
    tags: list[TagResponse] = []
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    items: list[NoteSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


# ──────────────────────────────────────────────────────────────────────────────
# Note Revision Schemas
# ──────────────────────────────────────────────────────────────────────────────

class NoteRevisionSummary(BaseModel):
    id: int
    note_id: int
    created_at: datetime
    created_by: int

    model_config = {"from_attributes": True}


class NoteRevisionDetail(BaseModel):
    id: int
    note_id: int
    content: str
    created_at: datetime
    created_by: int

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────────────────
# Backlinks / Graph Schemas
# ──────────────────────────────────────────────────────────────────────────────

class BacklinkNote(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str | None

    model_config = {"from_attributes": True}


class GraphNode(BaseModel):
    id: int
    title: str
    slug: str
    tag_names: list[str] = []


class GraphEdge(BaseModel):
    source: int
    target: int


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ──────────────────────────────────────────────────────────────────────────────
# Search Schemas
# ──────────────────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str | None
    # Highlighted snippets from search match
    title_highlight: str | None = None
    content_highlight: str | None = None
    tags: list[TagResponse] = []
    is_favorite: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int
    took_ms: float


# ──────────────────────────────────────────────────────────────────────────────
# Attachment Schemas
# ──────────────────────────────────────────────────────────────────────────────

class AttachmentResponse(BaseModel):
    id: int
    note_id: int | None
    original_filename: str
    content_type: str
    file_size: int
    width: int | None
    height: int | None
    created_at: datetime
    # Pre-signed URL for downloading — generated on the fly
    url: str | None = None

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────────────────
# Common Schemas
# ──────────────────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: str | None = None
